"use server";

import type {
  Question,
  Recording,
  Reflection,
  SpeechBrief,
  TopicSourceLink,
} from "@/domain/types";
import type { ReflectionInput } from "@/services/HostBrain";
import { searchWebContext, type SearchResult } from "@/src/brightdata";
import { getConfig } from "@/src/config";
import { elevenlabs, textToSpeechBuffer } from "@/src/elevenlabs";
import {
  buildSearchQueryFromSpeech,
  distillAudiencePrep,
  generateHostQuestions,
  generateHostReflection,
} from "@/src/gemini";
import { mastra } from "@/src/mastra";

function hasValidGeminiKey(): boolean {
  const { geminiApiKey } = getConfig();
  return Boolean(geminiApiKey && geminiApiKey !== "your_gemini_api_key_here");
}

function hasValidElevenLabsKey(): boolean {
  const { elevenLabsApiKey } = getConfig();
  return Boolean(elevenLabsApiKey && elevenLabsApiKey !== "your_elevenlabs_api_key_here");
}

function hasBrightDataCredentials(): boolean {
  return Boolean(process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_SERP_ZONE);
}

async function fetchNormalModeWebContext(
  brief: SpeechBrief,
  transcript: string
): Promise<SearchResult[]> {
  if (!hasBrightDataCredentials()) return [];
  try {
    const query = await buildSearchQueryFromSpeech(brief, transcript);
    return await searchWebContext(query, 8000);
  } catch (error) {
    console.warn("Normal Mode Bright Data lookup skipped:", error);
    return [];
  }
}

export interface AudiencePrepResult {
  insights: string[];
  sources: TopicSourceLink[];
}

export async function researchBriefAction(
  audience: string,
  purpose: string,
  notes: string
): Promise<AudiencePrepResult | null> {
  if (!hasBrightDataCredentials() || !hasValidGeminiKey()) return null;

  const trimmedAudience = audience.trim();
  const trimmedNotes = notes.trim();
  if (!trimmedAudience) return null;

  const query = trimmedNotes
    ? `${trimmedAudience} ${trimmedNotes.slice(0, 80)} key facts concerns`
    : `${trimmedAudience} presentation priorities questions`;

  const sources = await searchWebContext(query, 10000);
  const validSources = sources.filter(
    (s) => s.title.trim().length > 0 && s.description.trim().length > 0
  );

  if (validSources.length === 0) return null;

  const insights = await distillAudiencePrep(
    trimmedAudience,
    purpose || "inform",
    trimmedNotes,
    validSources
  );

  return {
    insights:
      insights.length > 0
        ? insights
        : validSources.slice(0, 3).map((s) => s.description.trim()),
    sources: validSources.slice(0, 3).map((s) => ({
      title: s.title,
      url: s.url,
    })),
  };
}

export async function generateQuestionsAction(
  brief: SpeechBrief,
  delivery: Recording
): Promise<Question[] | null> {
  if (!hasValidGeminiKey()) return null;

  try {
    const workflow = mastra.getWorkflow("qaWorkflow");
    const run = await workflow.createRun();
    const runResult = await run.start({
      inputData: {
        brief: {
          audience: brief.audience,
          purpose: brief.purpose,
          timeLimitMinutes: brief.timeLimitMinutes,
          ...(brief.notes !== undefined ? { notes: brief.notes } : {}),
        },
        delivery: {
          transcript: delivery.transcript,
          bodyLanguageObservations: delivery.bodyLanguageObservations,
        },
      },
    });
    if (runResult.status === "success") {
      return runResult.result.questions;
    }
  } catch (workflowError) {
    console.warn("Mastra qaWorkflow fallback:", workflowError);
  }

  const webSources = await fetchNormalModeWebContext(brief, delivery.transcript);
  return generateHostQuestions(brief, delivery, webSources);
}

export async function generateReflectionAction(
  input: ReflectionInput
): Promise<Reflection | null> {
  if (!hasValidGeminiKey()) return null;

  try {
    const workflow = mastra.getWorkflow("reflectionWorkflow");
    const run = await workflow.createRun();
    const runResult = await run.start({
      inputData: { input },
    });
    if (runResult.status === "success") {
      return runResult.result.reflection;
    }
  } catch (workflowError) {
    console.warn("Mastra reflectionWorkflow fallback:", workflowError);
  }

  const webSources =
    input.mode === "normal"
      ? await fetchNormalModeWebContext(input.brief, input.delivery.transcript)
      : undefined;
  return generateHostReflection(input, webSources);
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
