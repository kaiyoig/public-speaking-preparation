"use server";

import type { TopicBriefing } from "@/domain/types";
import { researchTopic } from "@/src/brightdata";
import { getConfig } from "@/src/config";
import { distillTopicSpeakingPoints } from "@/src/gemini";
import { getRandomTopic } from "@/src/improv-topics";

function hasBrightDataCredentials(): boolean {
  return Boolean(process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_SERP_ZONE);
}

function hasValidGeminiKey(): boolean {
  const { geminiApiKey } = getConfig();
  return Boolean(geminiApiKey && geminiApiKey !== "your_gemini_api_key_here");
}

/**
 * Picks a random improv/debate topic, scrapes live web results with Bright Data,
 * and uses Gemini to parse them into neat, speakable talking points.
 * Returns `null` if Bright Data credentials are not configured.
 */
export async function getImprovBriefingAction(): Promise<TopicBriefing | null> {
  if (!hasBrightDataCredentials()) {
    return null;
  }

  const topic = getRandomTopic();
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
