import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import type { TopicBriefing } from "../../../domain/types.ts";
import { researchTopic } from "../../brightdata.ts";
import { getConfig } from "../../config.ts";
import { distillTopicSpeakingPoints } from "../../gemini.ts";
import { getRandomTopic } from "../../improv-topics.ts";

const sourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
});

const topicBriefingSchema = z.object({
  topic: z.string(),
  speakingPoints: z.array(z.string()),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

const pickAndResearchTopicStep = createStep({
  id: "pick-and-research-topic",
  description: "Picks a random improv debate topic and scrapes live Bright Data SERP results",
  inputSchema: z.object({
    customTopic: z.string().optional(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    sources: z.array(sourceSchema),
  }),
  execute: async ({ inputData }) => {
    const topic = inputData.customTopic?.trim() || getRandomTopic();
    const research = await researchTopic(topic);
    const validSources = research.sources.filter(
      (s) => s.title.trim().length > 0 && s.description.trim().length > 0
    );
    return {
      topic,
      sources: validSources,
    };
  },
});

const distillBriefingStep = createStep({
  id: "distill-improv-briefing",
  description: "Distills Bright Data web sources into 4-5 speakable talking points with Gemini",
  inputSchema: z.object({
    topic: z.string(),
    sources: z.array(sourceSchema),
  }),
  outputSchema: z.object({
    briefing: topicBriefingSchema.nullable(),
  }),
  execute: async ({ inputData }) => {
    const { topic, sources } = inputData;
    const { geminiApiKey } = getConfig();
    const hasGemini = Boolean(
      geminiApiKey && geminiApiKey !== "your_gemini_api_key_here"
    );

    let speakingPoints: string[] = [];

    if (sources.length > 0 && hasGemini) {
      try {
        speakingPoints = await distillTopicSpeakingPoints(topic, sources);
      } catch (error) {
        console.error(
          "Mastra improvWorkflow: Gemini distillation failed, falling back to snippets:",
          error
        );
      }
    }

    if (speakingPoints.length === 0) {
      speakingPoints = sources.slice(0, 4).map((s) => s.description.trim());
    }

    if (speakingPoints.length === 0) {
      return { briefing: null };
    }

    const briefing: TopicBriefing = {
      topic,
      speakingPoints,
      sources: sources.slice(0, 3).map((s) => ({
        title: s.title,
        url: s.url,
      })),
    };

    return { briefing };
  },
});

export const improvWorkflow = createWorkflow({
  id: "improv-briefing-workflow",
  description:
    "Coordinates random topic selection, Bright Data SERP scraping, and Gemini talking-point distillation",
  inputSchema: z.object({
    customTopic: z.string().optional(),
  }),
  outputSchema: z.object({
    briefing: topicBriefingSchema.nullable(),
  }),
})
  .then(pickAndResearchTopicStep)
  .then(distillBriefingStep)
  .commit();
