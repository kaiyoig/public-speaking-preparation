"use server";

import type { Question, Recording, Reflection, SpeechBrief } from "@/domain/types";
import type { ReflectionInput } from "@/services/HostBrain";
import { getConfig } from "@/src/config";
import { elevenlabs, textToSpeechBuffer } from "@/src/elevenlabs";
import { generateHostQuestions, generateHostReflection } from "@/src/gemini";

function hasValidGeminiKey(): boolean {
  const { geminiApiKey } = getConfig();
  return Boolean(geminiApiKey && geminiApiKey !== "your_gemini_api_key_here");
}

function hasValidElevenLabsKey(): boolean {
  const { elevenLabsApiKey } = getConfig();
  return Boolean(elevenLabsApiKey && elevenLabsApiKey !== "your_elevenlabs_api_key_here");
}

export async function generateQuestionsAction(
  brief: SpeechBrief,
  delivery: Recording
): Promise<Question[] | null> {
  if (!hasValidGeminiKey()) return null;
  return generateHostQuestions(brief, delivery);
}

export async function generateReflectionAction(
  input: ReflectionInput
): Promise<Reflection | null> {
  if (!hasValidGeminiKey()) return null;
  return generateHostReflection(input);
}

export async function synthesizeSpeechBase64Action(
  text: string
): Promise<string | null> {
  if (!hasValidElevenLabsKey()) return null;
  const buffer = await textToSpeechBuffer(text);
  return buffer.toString("base64");
}

export async function getRealtimeScribeTokenAction(): Promise<string | null> {
  if (!hasValidElevenLabsKey()) return null;
  const response = await elevenlabs.tokens.singleUse.create("realtime_scribe");
  return response.token;
}
