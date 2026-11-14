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

  await play(audioStream);
}

/**
 * Lists available voices in your ElevenLabs account.
 */
export async function listVoices() {
  const response = await elevenlabs.voices.search();
  return response.voices ?? [];
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
