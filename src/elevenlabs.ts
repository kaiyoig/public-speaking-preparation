import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ElevenLabsClient, play } from "@elevenlabs/elevenlabs-js";
import { getConfig } from "./config.ts";

const config = getConfig();

export const elevenlabs = new ElevenLabsClient({
  apiKey: config.elevenLabsApiKey,
});

/**
 * Helper to collect a Web ReadableStream<Uint8Array> into a Node Buffer.
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * Converts text into an MP3 audio Buffer using ElevenLabs.
 */
export async function textToSpeechBuffer(
  text: string,
  voiceId: string = config.defaultElevenLabsVoiceId
): Promise<Buffer> {
  const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    modelId: config.defaultElevenLabsModelId,
    outputFormat: "mp3_44100_128",
  });

  return streamToBuffer(audioStream);
}

/**
 * Converts text to speech and saves the resulting MP3 file to disk.
 */
export async function saveSpeechToFile(
  text: string,
  outputPath: string,
  voiceId: string = config.defaultElevenLabsVoiceId
): Promise<string> {
  const buffer = await textToSpeechBuffer(text, voiceId);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
  return outputPath;
}

/**
 * Converts text to speech and plays it aloud (requires mpv/ffmpeg installed on PATH).
 */
export async function speakText(
  text: string,
  voiceId: string = config.defaultElevenLabsVoiceId
): Promise<void> {
  const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    modelId: config.defaultElevenLabsModelId,
  });

  await play(audioStream as unknown as AsyncIterable<Uint8Array>);
}

/**
 * Lists available voices in your ElevenLabs account.
 */
export async function listVoices() {
  const response = await elevenlabs.voices.search();
  return response.voices ?? [];
}

export interface BatchTranscriptionResult {
  text: string;
  words: Array<{
    text?: string;
    start?: number;
    end?: number;
    type?: string;
  }>;
}

/**
 * Transcribes a recorded audio buffer with ElevenLabs Scribe v2 batch API
 * (`scribe_v2`) locked to English for high-accuracy final transcripts and word timings.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<BatchTranscriptionResult | null> {
  const ext = mimeType.includes("mp4")
    ? "mp4"
    : mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("wav")
        ? "wav"
        : "webm";

  const audioFile = new File([new Uint8Array(buffer)], `speech.${ext}`, {
    type: mimeType,
  });

  const response = await elevenlabs.speechToText.convert({
    modelId: "scribe_v2",
    file: audioFile,
    languageCode: "en",
    timestampsGranularity: "word",
    tagAudioEvents: false,
  });

  if ("text" in response && typeof response.text === "string") {
    const words = Array.isArray(response.words)
      ? response.words.map((w) => ({
          ...(w.text !== undefined ? { text: w.text } : {}),
          ...(w.start !== undefined ? { start: w.start } : {}),
          ...(w.end !== undefined ? { end: w.end } : {}),
          ...(w.type !== undefined ? { type: w.type } : {}),
        }))
      : [];
    return {
      text: response.text.trim(),
      words,
    };
  }

  return null;
}

// Run standalone starter check if executed directly: `npm run elevenlabs`
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const outputPath = "./output/elevenlabs-test.mp3";
  console.log("Generating sample speech with ElevenLabs...");
  await saveSpeechToFile(
    "Hello! Welcome to your public speaking preparation coach.",
    outputPath
  );
  console.log(`Saved sample audio to ${outputPath}`);
}
