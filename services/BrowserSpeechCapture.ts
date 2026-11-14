import { getRealtimeScribeTokenAction } from "@/app/actions/hostBrain";
import type { Recording } from "@/domain/types";
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

/**
 * Real-time browser microphone SpeechCapture.
 * Streams mic audio to ElevenLabs Scribe Realtime (`scribe_v2_realtime`) using a single-use token,
 * and falls back to the browser's Web Speech API if ElevenLabs is not configured or unavailable.
 */
export class BrowserSpeechCapture implements SpeechCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private socket: WebSocket | null = null;
  private recognition: SpeechRecognitionLike | null = null;

  private committedParts: string[] = [];
  private partialText = "";
  private onTranscript: ((text: string) => void) | undefined;

  async start(options?: SpeechCaptureStartOptions): Promise<void> {
    this.committedParts = [];
    this.partialText = "";
    this.onTranscript = options?.onTranscript;

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

    const token = await getRealtimeScribeTokenAction().catch(() => null);
    if (token) {
      await this.startElevenLabsRealtime(token, this.mediaStream);
    } else {
      this.startBrowserSpeechRecognition();
    }
  }

  async stop(): Promise<Recording> {
    // Send a final commit if ElevenLabs WebSocket is still open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(
          JSON.stringify({
            message_type: "input_audio_chunk",
            audio_base_64: "",
            commit: true,
            sample_rate: 16000,
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

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    const transcript = this.buildTranscript();
    return {
      transcript,
      bodyLanguageObservations: [],
    };
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

  private async startElevenLabsRealtime(token: string, stream: MediaStream): Promise<void> {
    const wsUrl =
      `wss://api.elevenlabs.io/v1/speech-to-text/realtime` +
      `?model_id=scribe_v2_realtime&token=${encodeURIComponent(token)}` +
      `&audio_format=pcm_16000&commit_strategy=vad`;

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
          this.partialText = "";
          this.emitTranscript();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    const audioContext = new AudioContext({ sampleRate: 16000 });
    this.audioContext = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (e) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const base64Audio = float32ToPcm16Base64(inputData);
      this.socket.send(
        JSON.stringify({
          message_type: "input_audio_chunk",
          audio_base_64: base64Audio,
          commit: false,
          sample_rate: 16000,
        })
      );
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
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
