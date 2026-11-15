"use server";

import type { TopicBriefing, TopicKind } from "@/domain/types";
import { researchTopic } from "@/src/brightdata";
import { getConfig } from "@/src/config";
import { distillTopicSpeakingPoints } from "@/src/gemini";
import { getRandomTopic } from "@/src/improv-topics";
import { mastra } from "@/src/mastra";
import { getTrendingTopic } from "@/src/trending-topics";

function hasBrightDataCredentials(): boolean {
  return Boolean(process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_SERP_ZONE);
}

function hasValidGeminiKey(): boolean {
  const { geminiApiKey } = getConfig();
  return Boolean(geminiApiKey && geminiApiKey !== "your_gemini_api_key_here");
}

/**
 * Picks a topic of the given kind, without researching it.
 * Classic draws from the fixed list; Trending has Gemini write one from recent Bright Data headlines.
 * Returns `null` if a trending topic can't be found.
 */
async function pickTopic(kind: TopicKind): Promise<string | null> {
  if (kind === "classic") {
    return getRandomTopic();
  }
  if (!hasValidGeminiKey()) {
    return null;
  }
  try {
    return await getTrendingTopic();
  } catch (error) {
    console.error("Trending topic unavailable:", error);
    return null;
  }
}

/**
 * Picks a topic of the given kind, scrapes live web results about it with Bright Data,
 * and uses Gemini to parse them into neat, speakable talking points via the Mastra workflow.
 * Returns `null` if Bright Data credentials are not configured, or no topic could be found.
 */
export async function getImprovBriefingAction(kind: TopicKind): Promise<TopicBriefing | null> {
  if (!hasBrightDataCredentials()) {
    return null;
  }

  const topic = await pickTopic(kind);
  if (!topic) {
    return null;
  }

  try {
    const workflow = mastra.getWorkflow("improvWorkflow");
    const run = await workflow.createRun();
    const runResult = await run.start({ inputData: { customTopic: topic } });
    if (runResult.status === "success" && runResult.result.briefing) {
      const b = runResult.result.briefing;
      const briefing: TopicBriefing = {
        topic: b.topic,
        speakingPoints: b.speakingPoints,
      };
      if (b.sources && b.sources.length > 0) {
        briefing.sources = b.sources;
      }
      return briefing;
    }
  } catch (workflowError) {
    console.warn("Mastra improvWorkflow fallback:", workflowError);
  }

  const research = await researchTopic(topic);

  const validSources = research.sources.filter(
    (s) => s.title.trim().length > 0 && s.description.trim().length > 0
  );

  let speakingPoints: string[] = [];

  if (validSources.length > 0 && hasValidGeminiKey()) {
    try {
      speakingPoints = await distillTopicSpeakingPoints(topic, validSources);
    } catch (error) {
      console.error("Gemini failed to distill Bright Data results, using raw snippets:", error);
    }
  }

  if (speakingPoints.length === 0) {
    speakingPoints = validSources.slice(0, 4).map((s) => s.description.trim());
  }

  if (speakingPoints.length === 0) {
    return null;
  }

  return {
    topic,
    speakingPoints,
    sources: validSources.slice(0, 3).map((s) => ({
      title: s.title,
      url: s.url,
    })),
  };
}
