import { getRealtimeScribeTokenAction } from "@/app/actions/hostBrain";
import type { Recording, VocalDeliveryMetrics } from "@/domain/types";
import type { SpeechCapture, SpeechCaptureStartOptions } from "./SpeechCapture";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface ScribeWordTiming {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
}

const SAMPLE_RATE = 16000;
const SILENCE_RMS_THRESHOLD = 0.015;
const MAX_GEMINI_AUDIO_BYTES = 3_500_000;

/**
 * Real-time browser microphone SpeechCapture.
 * - Streams mic audio to ElevenLabs Scribe Realtime (`scribe_v2_realtime`) with word timestamps
 *   (falling back to Web Speech API if ElevenLabs is unavailable).
 * - Measures real-time vocal volume, dynamic range, pitch/inflection variation (Hz), and pauses.
 * - Captures a compressed audio clip via MediaRecorder so Gemini can directly evaluate vocal
 *   inflection, tone, and delivery in the final Reflection.
 */
export class BrowserSpeechCapture implements SpeechCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private socket: WebSocket | null = null;
  private recognition: SpeechRecognitionLike | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private committedParts: string[] = [];
  private partialText = "";
  private onTranscript: ((text: string) => void) | undefined;

  private startedAtMs = 0;
  private voicedRmsValues: number[] = [];
  private pitchHzValues: number[] = [];
  private wordTimings: ScribeWordTiming[] = [];
  private acousticPauseCount = 0;
  private wasVoiced = false;
  private silenceFrames = 0;

  async start(options?: SpeechCaptureStartOptions): Promise<void> {
    this.committedParts = [];
    this.partialText = "";
    this.onTranscript = options?.onTranscript;
    this.startedAtMs = Date.now();
    this.voicedRmsValues = [];
    this.pitchHzValues = [];
    this.wordTimings = [];
    this.acousticPauseCount = 0;
    this.wasVoiced = false;
    this.silenceFrames = 0;
    this.recordedChunks = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported in this browser.");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.startMediaRecorder(this.mediaStream);

    const token = await getRealtimeScribeTokenAction().catch(() => null);
    if (token) {
      await this.startElevenLabsRealtime(token, this.mediaStream);
    } else {
      this.startAcousticPipeline(this.mediaStream);
      this.startBrowserSpeechRecognition();
    }
  }

  async stop(): Promise<Recording> {
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startedAtMs) / 1000));

    // Send a final commit if ElevenLabs WebSocket is still open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(
          JSON.stringify({
            message_type: "input_audio_chunk",
            audio_base_64: "",
            commit: true,
            sample_rate: SAMPLE_RATE,
          })
        );
      } catch {
        // Ignore socket send errors during teardown
      }
      this.socket.close();
    }
    this.socket = null;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop errors
      }
      this.recognition = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      await this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    const audioPayload = await this.stopMediaRecorder();

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    const transcript = this.buildTranscript();
    const vocalMetrics = this.computeVocalMetrics(transcript, durationSeconds);

    const recording: Recording = {
      transcript,
      bodyLanguageObservations: [],
      vocalMetrics,
    };

    if (audioPayload) {
      recording.audioBase64 = audioPayload.base64;
      recording.audioMimeType = audioPayload.mimeType;
    }

    return recording;
  }

  private buildTranscript(): string {
    const committed = this.committedParts.join(" ").trim();
    const partial = this.partialText.trim();
    if (committed && partial) return `${committed} ${partial}`;
    return committed || partial;
  }

  private emitTranscript() {
    this.onTranscript?.(this.buildTranscript());
  }

  private startMediaRecorder(stream: MediaStream) {
    if (typeof MediaRecorder === "undefined") return;
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      recorder.start(1000);
      this.mediaRecorder = recorder;
    } catch {
      this.mediaRecorder = null;
    }
  }

  private async stopMediaRecorder(): Promise<{ base64: string; mimeType: string } | null> {
    const recorder = this.mediaRecorder;
    this.mediaRecorder = null;
    if (!recorder) return null;

    await new Promise<void>((resolve) => {
      if (recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.onstop = () => resolve();
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });

    if (this.recordedChunks.length === 0) return null;
    const rawMime = recorder.mimeType || "audio/webm";
    const cleanMime = rawMime.split(";")[0]?.trim() || "audio/webm";
    const blob = new Blob(this.recordedChunks, { type: cleanMime });
    if (blob.size === 0 || blob.size > MAX_GEMINI_AUDIO_BYTES) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return {
      base64: btoa(binary),
      mimeType: cleanMime,
    };
  }

  private startAcousticPipeline(stream: MediaStream, onFrame?: (inputData: Float32Array) => void) {
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.audioContext = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.analyzeAudioFrame(inputData);
      onFrame?.(inputData);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  private analyzeAudioFrame(samples: Float32Array) {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i] ?? 0;
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, samples.length));

    if (rms >= SILENCE_RMS_THRESHOLD) {
      this.voicedRmsValues.push(rms);
      // ~0.256s per 4096-sample frame at 16kHz; >= 3 silent frames (~0.75s) after speech counts as a pause
      if (this.wasVoiced && this.silenceFrames >= 3) {
        this.acousticPauseCount++;
      }
      this.wasVoiced = true;
      this.silenceFrames = 0;

      const pitchHz = estimatePitchHz(samples, SAMPLE_RATE);
      if (pitchHz !== null) {
        this.pitchHzValues.push(pitchHz);
      }
    } else if (this.wasVoiced) {
      this.silenceFrames++;
    }
  }

  private computeVocalMetrics(transcript: string, durationSeconds: number): VocalDeliveryMetrics {
    const words = transcript
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wordCount = words.length;
    const wordsPerMinute = Math.round((wordCount / Math.max(1, durationSeconds)) * 60);

    const paceLabel: VocalDeliveryMetrics["paceLabel"] =
      wordsPerMinute < 110 ? "slow" : wordsPerMinute <= 165 ? "conversational" : "fast";

    // Volume level & dynamic range from RMS samples
    const meanRms = mean(this.voicedRmsValues);
    const stdRms = stdDev(this.voicedRmsValues, meanRms);
    const volumeLevel: VocalDeliveryMetrics["volumeLevel"] =
      meanRms < 0.035 ? "quiet" : meanRms <= 0.14 ? "balanced" : "loud";
    const relativeRmsSpread = meanRms > 0 ? stdRms / meanRms : 0;
    const volumeDynamics: VocalDeliveryMetrics["volumeDynamics"] =
      relativeRmsSpread < 0.28 ? "flat" : relativeRmsSpread <= 0.55 ? "moderate" : "dynamic";

    // Vocal inflection from pitch standard deviation (Hz)
    const meanPitch = mean(this.pitchHzValues);
    const pitchRangeHz = Math.round(stdDev(this.pitchHzValues, meanPitch));
    const inflectionVariety: VocalDeliveryMetrics["inflectionVariety"] =
      pitchRangeHz < 15 ? "monotone" : pitchRangeHz <= 35 ? "natural" : "expressive";

    // Pauses from ElevenLabs word timestamps if available, otherwise acoustic pause count
    let pauseCount = this.acousticPauseCount;
    if (this.wordTimings.length > 1) {
      let timingPauses = 0;
      let prevEnd: number | undefined;
      for (const item of this.wordTimings) {
        if (item.type && item.type !== "word") continue;
        if (prevEnd !== undefined && item.start !== undefined && item.start - prevEnd >= 0.6) {
          timingPauses++;
        }
        if (item.end !== undefined) {
          prevEnd = item.end;
        }
      }
      pauseCount = Math.max(pauseCount, timingPauses);
    }

    // Filler word detection
    const lowerText = transcript.toLowerCase();
    const fillerPatterns = ["um", "uh", "like", "you know", "basically", "actually", "literally"];
    let fillerWordCount = 0;
    const detectedFillers: string[] = [];

    for (const filler of fillerPatterns) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        fillerWordCount += matches.length;
        detectedFillers.push(`${filler} (${matches.length})`);
      }
    }

    return {
      durationSeconds,
      wordsPerMinute,
      paceLabel,
      volumeLevel,
      volumeDynamics,
      inflectionVariety,
      pitchRangeHz,
      pauseCount,
      fillerWordCount,
      detectedFillers,
    };
  }

  private async startElevenLabsRealtime(token: string, stream: MediaStream): Promise<void> {
    const wsUrl =
      `wss://api.elevenlabs.io/v1/speech-to-text/realtime` +
      `?model_id=scribe_v2_realtime&token=${encodeURIComponent(token)}` +
      `&audio_format=pcm_16000&commit_strategy=vad&include_timestamps=true`;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out connecting to ElevenLabs STT.")), 8000);

      socket.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Failed to connect to ElevenLabs real-time speech-to-text."));
      };
    });

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          message_type?: string;
          text?: string;
          words?: ScribeWordTiming[];
        };
        if (msg.message_type === "partial_transcript") {
          this.partialText = msg.text ?? "";
          this.emitTranscript();
        } else if (
          msg.message_type === "committed_transcript" ||
          msg.message_type === "committed_transcript_with_timestamps"
        ) {
          const text = (msg.text ?? "").trim();
          if (text) this.committedParts.push(text);
          if (Array.isArray(msg.words)) {
            this.wordTimings.push(...msg.words);
          }
          this.partialText = "";
          this.emitTranscript();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.startAcousticPipeline(stream, (inputData) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const base64Audio = float32ToPcm16Base64(inputData);
      this.socket.send(
        JSON.stringify({
          message_type: "input_audio_chunk",
          audio_base_64: base64Audio,
          commit: false,
          sample_rate: SAMPLE_RATE,
        })
      );
    });
  }

  private startBrowserSpeechRecognition(): void {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const finals: string[] = [];
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finals.push(text.trim());
        } else {
          interim += text;
        }
      }
      this.committedParts = finals.filter(Boolean);
      this.partialText = interim;
      this.emitTranscript();
    };

    recognition.start();
    this.recognition = recognition;
  }
}

function float32ToPcm16Base64(float32Array: Float32Array): string {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i] ?? 0));
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * Estimates fundamental frequency (F0 in Hz) of a voiced frame using normalized autocorrelation
 * across the human speaking pitch range (75 Hz to 400 Hz).
 */
function estimatePitchHz(samples: Float32Array, sampleRate: number): number | null {
  const minLag = Math.floor(sampleRate / 400); // 400 Hz max
  const maxLag = Math.floor(sampleRate / 75);  // 75 Hz min
  const length = Math.min(samples.length, 2048);

  let bestCorrelation = 0;
  let bestLag = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let normA = 0;
    let normB = 0;
    const count = length - lag;
    for (let i = 0; i < count; i++) {
      const a = samples[i] ?? 0;
      const b = samples[i + lag] ?? 0;
      sum += a * b;
      normA += a * a;
      normB += b * b;
    }
    const denom = Math.sqrt(normA * normB);
    const corr = denom > 0 ? sum / denom : 0;
    if (corr > bestCorrelation) {
      bestCorrelation = corr;
      bestLag = lag;
    }
  }

  if (bestLag > 0 && bestCorrelation >= 0.55) {
    return sampleRate / bestLag;
  }
  return null;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  let sumSq = 0;
  for (const v of values) {
    const diff = v - avg;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / values.length);
}
