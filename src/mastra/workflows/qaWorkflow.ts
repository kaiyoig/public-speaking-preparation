import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import type { Question, Recording, SpeechBrief } from "../../../domain/types.ts";
import { searchWebContext } from "../../brightdata.ts";
import { buildSearchQueryFromSpeech, generateHostQuestions } from "../../gemini.ts";

const speechBriefSchema = z.object({
  audience: z.string(),
  purpose: z.enum(["inform", "persuade", "entertain", "other"]),
  timeLimitMinutes: z.number(),
  notes: z.string().optional(),
});

const recordingSchema = z.object({
  transcript: z.string(),
  bodyLanguageObservations: z.array(z.string()),
});

const sourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
});

const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

function buildCleanBrief(raw: z.infer<typeof speechBriefSchema>): SpeechBrief {
  const brief: SpeechBrief = {
    audience: raw.audience,
    purpose: raw.purpose,
    timeLimitMinutes: raw.timeLimitMinutes,
  };
  if (raw.notes !== undefined) {
    brief.notes = raw.notes;
  }
  return brief;
}

const researchSpeechContextStep = createStep({
  id: "research-speech-context",
  description:
    "Generates a targeted search query from the speech and fetches live Bright Data SERP context",
  inputSchema: z.object({
    brief: speechBriefSchema,
    delivery: recordingSchema,
  }),
  outputSchema: z.object({
    brief: speechBriefSchema,
    delivery: recordingSchema,
    webSources: z.array(sourceSchema),
  }),
  execute: async ({ inputData }) => {
    const hasBrightData = Boolean(
      process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_SERP_ZONE
    );

    if (!hasBrightData) {
      return {
        brief: inputData.brief,
        delivery: inputData.delivery,
        webSources: [],
      };
    }

    try {
      const brief = buildCleanBrief(inputData.brief);
      const query = await buildSearchQueryFromSpeech(
        brief,
        inputData.delivery.transcript
      );
      const webSources = await searchWebContext(query, 8000);
      return {
        brief: inputData.brief,
        delivery: inputData.delivery,
        webSources,
      };
    } catch (error) {
      console.warn("Mastra qaWorkflow Bright Data lookup skipped:", error);
      return {
        brief: inputData.brief,
        delivery: inputData.delivery,
        webSources: [],
      };
    }
  },
});

const synthesizeQuestionsStep = createStep({
  id: "synthesize-qa-questions",
  description: "Synthesizes 3 audience-tailored Q&A questions using Gemini and web research",
  inputSchema: z.object({
    brief: speechBriefSchema,
    delivery: recordingSchema,
    webSources: z.array(sourceSchema),
  }),
  outputSchema: z.object({
    questions: z.array(questionSchema),
  }),
  execute: async ({ inputData }) => {
    const brief = buildCleanBrief(inputData.brief);
    const delivery: Recording = {
      transcript: inputData.delivery.transcript,
      bodyLanguageObservations: inputData.delivery.bodyLanguageObservations,
    };
    const questions: Question[] = await generateHostQuestions(
      brief,
      delivery,
      inputData.webSources
    );
    return { questions };
  },
});

export const qaWorkflow = createWorkflow({
  id: "qa-generation-workflow",
  description:
    "Coordinates Bright Data live web fact-checking and Gemini Q&A question generation",
  inputSchema: z.object({
    brief: speechBriefSchema,
    delivery: recordingSchema,
  }),
  outputSchema: z.object({
    questions: z.array(questionSchema),
  }),
})
  .then(researchSpeechContextStep)
  .then(synthesizeQuestionsStep)
  .commit();
