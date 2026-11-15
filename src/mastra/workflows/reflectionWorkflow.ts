import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import type { Reflection } from "../../../domain/types.ts";
import type { ReflectionInput } from "../../../services/HostBrain.ts";
import { searchWebContext, type SearchResult } from "../../brightdata.ts";
import { getRecentSessionSummaries, savePracticeSession } from "../../db.ts";
import {
  buildSearchQueryFromSpeech,
  generateHostReflection,
} from "../../gemini.ts";

const reflectionInputHolderSchema = z.object({
  input: z.custom<ReflectionInput>(),
});

const sourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
});

const gatherReflectionContextStep = createStep({
  id: "gather-reflection-context",
  description:
    "Fetches prior practice session history from Neon Postgres and live web research from Bright Data in parallel",
  inputSchema: reflectionInputHolderSchema,
  outputSchema: z.object({
    input: z.custom<ReflectionInput>(),
    webSources: z.array(sourceSchema),
    priorSessionSummaries: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { input } = inputData;
    const hasBrightData = Boolean(
      process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_SERP_ZONE
    );

    const webPromise: Promise<SearchResult[]> =
      input.mode === "normal" && hasBrightData
        ? (async () => {
            try {
              const query = await buildSearchQueryFromSpeech(
                input.brief,
                input.delivery.transcript
              );
              return await searchWebContext(query, 8000);
            } catch (err) {
              console.warn("Mastra reflectionWorkflow web lookup skipped:", err);
              return [];
            }
          })()
        : Promise.resolve([]);

    const historyPromise = getRecentSessionSummaries(3);

    const [webSources, priorSessionSummaries] = await Promise.all([
      webPromise,
      historyPromise,
    ]);

    return {
      input,
      webSources,
      priorSessionSummaries,
    };
  },
});

const generateAndPersistReflectionStep = createStep({
  id: "generate-and-persist-reflection",
  description:
    "Generates the multimodal Gemini reflection (with vocal telemetry, web sources, and Neon history) and persists the session to Neon Postgres",
  inputSchema: z.object({
    input: z.custom<ReflectionInput>(),
    webSources: z.array(sourceSchema),
    priorSessionSummaries: z.array(z.string()),
  }),
  outputSchema: z.object({
    reflection: z.custom<Reflection>(),
  }),
  execute: async ({ inputData }) => {
    const { input, webSources, priorSessionSummaries } = inputData;

    const reflection = await generateHostReflection(
      input,
      webSources.length > 0 ? webSources : undefined,
      priorSessionSummaries.length > 0 ? priorSessionSummaries : undefined
    );

    await savePracticeSession(input, reflection);

    return { reflection };
  },
});

export const reflectionWorkflow = createWorkflow({
  id: "coaching-reflection-workflow",
  description:
    "Orchestrates Neon Postgres cross-session memory, Bright Data evidence lookup, Gemini multimodal vocal & content reflection, and Neon session persistence",
  inputSchema: reflectionInputHolderSchema,
  outputSchema: z.object({
    reflection: z.custom<Reflection>(),
  }),
})
  .then(gatherReflectionContextStep)
  .then(generateAndPersistReflectionStep)
  .commit();
