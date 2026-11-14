import { GoogleGenAI, Type } from "@google/genai";
import { QUESTION_COUNT } from "../domain/config.ts";
import type { Question, Recording, Reflection, SpeechBrief } from "../domain/types.ts";
import type { ReflectionInput } from "../services/HostBrain.ts";
import { getConfig } from "./config.ts";

const config = getConfig();

export const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

/**
 * Formats a SpeechBrief (Audience, Purpose, Time Limit, and optional Notes)
 * into a structured context block for the Gemini context window.
 */
export function formatSpeechBriefContext(brief: SpeechBrief): string {
  const lines = [
    `Audience: ${brief.audience}`,
    `Purpose: ${brief.purpose}`,
    `Time Limit: ${brief.timeLimitMinutes} minute${brief.timeLimitMinutes === 1 ? "" : "s"}`,
  ];

  const trimmedNotes = brief.notes?.trim();
  if (trimmedNotes) {
    lines.push(`Speaker Notes / Outline:\n${trimmedNotes}`);
  }

  return lines.join("\n");
}

function resolveContextString(briefOrContext: SpeechBrief | string): string {
  return typeof briefOrContext === "string"
    ? briefOrContext
    : formatSpeechBriefContext(briefOrContext);
}

/**
 * Basic Gemini starter function to generate text from a prompt.
 */
export async function generateText(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: config.defaultGeminiModel,
    contents: prompt,
    ...(systemInstruction ? { config: { systemInstruction } } : {}),
  });

  return response.text ?? "";
}

/**
 * Generates an impromptu follow-up question based on the speaker's SpeechBrief
 * (Audience, Purpose, Time Limit, and optional Notes) and what they said.
 */
export async function generateImpromptuQuestion(
  briefOrContext: SpeechBrief | string,
  transcript: string
): Promise<string> {
  const contextBlock = resolveContextString(briefOrContext);
  const systemInstruction =
    "You are an attentive public speaking coach and audience member. " +
    "Use the Speech Brief (Audience, Purpose, Time Limit, and any Speaker Notes) " +
    "along with the speech transcript to ask a some concise, natural-sounding follow-up question (1-2 sentences). " +
    "Write it so it sounds natural when spoken aloud via text-to-speech.";

  const prompt = `Speech Brief:\n${contextBlock}\n\nTranscript so far:\n"${transcript}"\n\nAsk one follow-up question:`;
  return generateText(prompt, systemInstruction);
}

/**
 * Generates an end-of-speech reflection highlighting strengths and areas for improvement
 * based on the SpeechBrief (Audience, Purpose, Time Limit, and optional Notes) and transcript.
 */
export async function generateSpeechReflection(
  briefOrContext: SpeechBrief | string,
  transcript: string
): Promise<string> {
  const contextBlock = resolveContextString(briefOrContext);
  const systemInstruction =
    "You are a supportive and constructive public speaking coach. " +
    "Evaluate the speech against the Speech Brief (Audience, Purpose, Time Limit, and any Speaker Notes). " +
    "Provide a short spoken reflection (3-4 sentences) highlighting what went well " +
    "and 1-2 specific areas to improve. Avoid markdown bullet points or special symbols " +
    "so that the response can be read directly by a text-to-speech engine.";

  const prompt = `Speech Brief:\n${contextBlock}\n\nFull Speech Transcript:\n"${transcript}"\n\nProvide your spoken coaching reflection:`;
  return generateText(prompt, systemInstruction);
}

/**
 * Generates the Q&A Questions array for the HostBrain service using the SpeechBrief
 * (Audience, Purpose, Time Limit, and optional Notes) and the Delivery Recording.
 */
export async function generateHostQuestions(
  brief: SpeechBrief,
  delivery: Recording
): Promise<Question[]> {
  const contextBlock = formatSpeechBriefContext(brief);
  const transcriptText = delivery.transcript.trim();
  const transcriptBlock = transcriptText
    ? `Speaker's Delivery Transcript (from Speech-to-Text):\n"${transcriptText}"`
    : `Speaker's Delivery Transcript:\n(No transcript captured yet; generate ${QUESTION_COUNT} questions based on the Speech Brief above.)`;

  const bodyLanguageBlock =
    delivery.bodyLanguageObservations.length > 0
      ? `\nBody Language Observations:\n- ${delivery.bodyLanguageObservations.join("\n- ")}`
      : "";

  const prompt =
    `Speech Brief:\n${contextBlock}\n\n` +
    `${transcriptBlock}` +
    `${bodyLanguageBlock}\n\n` +
    `Return a JSON object with a "questions" array containing exactly ${QUESTION_COUNT} concise, natural-sounding follow-up questions tailored to the target audience, purpose, time limit${brief.notes?.trim() ? ", and the speaker's notes" : ""}.`;

  const response = await ai.models.generateContent({
    model: config.defaultGeminiModel,
    contents: prompt,
    config: {
      systemInstruction:
        "You are an AI public speaking Host conducting a live Q&A session after a speaker's talk. " +
        "Ask thoughtful, conversational questions (1-2 sentences each) from the perspective of the specified Audience and aligned with the speech's Purpose. " +
        `Always output valid JSON matching { "questions": string[] } with ${QUESTION_COUNT} questions.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["questions"],
      },
    },
  });

  const rawText = response.text ?? "{}";
  const parsed = JSON.parse(rawText) as { questions?: string[] } | string[];
  const list = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);

  return list
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, QUESTION_COUNT)
    .map((text, index) => ({
      id: `q${index + 1}`,
      text,
    }));
}

/**
 * Generates the structured Reflection for the HostBrain service, incorporating
 * Audience, Purpose, Time Limit, and optional Notes (in Normal Mode) or Topic Briefing (in Improv Mode).
 */
export async function generateHostReflection(
  input: ReflectionInput
): Promise<Reflection> {
  let contextSection: string;

  if (input.mode === "normal") {
    const qaTranscripts =
      input.answers.length > 0
        ? `\n\nQ&A Answers:\n${input.answers
            .map((a, i) => `Answer ${i + 1}: "${a.transcript}"`)
            .join("\n")}`
        : "";
    contextSection = `Mode: Normal Mode\nSpeech Brief:\n${formatSpeechBriefContext(input.brief)}${qaTranscripts}`;
  } else {
    contextSection =
      `Mode: Improv Mode (2-minute time limit)\n` +
      `Topic: ${input.topicBriefing.topic}\n` +
      `Speaking Points:\n- ${input.topicBriefing.speakingPoints.join("\n- ")}`;
  }

  const bodyLanguageNotes =
    input.delivery.bodyLanguageObservations.length > 0
      ? input.delivery.bodyLanguageObservations.join("; ")
      : "No camera observations recorded.";

  const prompt =
    `${contextSection}\n\n` +
    `Delivery Transcript:\n"${input.delivery.transcript}"\n\n` +
    `Body Language Observations: ${bodyLanguageNotes}\n\n` +
    `Provide a structured coaching reflection evaluating how well the speaker met their audience, purpose, time limit, and notes/speaking points.`;

  const sectionSchema = {
    type: Type.OBJECT,
    properties: {
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      improvements: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["strengths", "improvements"],
  };

  const response = await ai.models.generateContent({
    model: config.defaultGeminiModel,
    contents: prompt,
    config: {
      systemInstruction:
        "You are a supportive, insightful public speaking coach. " +
        "Return a structured JSON reflection with a spoken `summary` (2-3 natural sentences suitable for text-to-speech, with no numeric scores) " +
        "and 2 strengths + 2 improvements each for `bodyLanguage`, `voiceAndDelivery`, and `content`.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          bodyLanguage: sectionSchema,
          voiceAndDelivery: sectionSchema,
          content: sectionSchema,
        },
        required: ["summary", "bodyLanguage", "voiceAndDelivery", "content"],
      },
    },
  });

  return JSON.parse(response.text ?? "{}") as Reflection;
}

// Run standalone starter check if executed directly: `npm run gemini`
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const sampleBrief: SpeechBrief = {
    audience: "First-year university students",
    purpose: "persuade",
    timeLimitMinutes: 3,
    notes: "Cover dining hall portion choices and nightly surplus pickup app.",
  };
  console.log("Formatted SpeechBrief context:\n" + formatSpeechBriefContext(sampleBrief) + "\n");
  const sampleReply = await generateImpromptuQuestion(
    sampleBrief,
    "Every day, thousands of pounds of edible food are thrown out across our campus dining halls."
  );
  console.log("Gemini question:\n", sampleReply);
}
