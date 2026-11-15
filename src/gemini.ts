import { GoogleGenAI, Type } from "@google/genai";
import { QUESTION_COUNT, REFLECTION_POINTS } from "../domain/config.ts";
import type {
  Question,
  Recording,
  Reflection,
  SpeechBrief,
  VocalDeliveryMetrics,
} from "../domain/types.ts";
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

/**
 * Formats measured acoustic & ElevenLabs STT vocal delivery telemetry
 * (pace/WPM, volume projection & dynamic range, pitch/inflection variation, pauses, and fillers)
 * for the Gemini context window.
 */
export function formatVocalMetricsContext(metrics?: VocalDeliveryMetrics): string {
  if (!metrics) return "Vocal Telemetry: Not captured.";
  const fillerDetail =
    metrics.detectedFillers.length > 0
      ? ` (${metrics.detectedFillers.join(", ")})`
      : "";
  return [
    `Duration: ${metrics.durationSeconds}s`,
    `Speaking Pace: ${metrics.wordsPerMinute} WPM (${metrics.paceLabel} pace; ideal conversational range is 120-155 WPM)`,
    `Volume Level & Projection: ${metrics.volumeLevel} (${metrics.volumeDynamics} volume dynamics)`,
    `Vocal Inflection & Pitch Variety: ${metrics.inflectionVariety} (~${metrics.pitchRangeHz} Hz pitch variation across voiced frames)`,
    `Pauses (>=0.6s): ${metrics.pauseCount}`,
    `Filler Words: ${metrics.fillerWordCount}${fillerDetail}`,
  ].join("\n");
}

/**
 * Formats OpenCV camera telemetry (YuNet landmark gaze/eye-contact tracking
 * and MobileFaceNet facial expression recognition) for the Gemini context window.
 */
export function formatBodyLanguageContext(observations?: string[]): string {
  if (!observations || observations.length === 0) {
    return "Camera Telemetry (OpenCV): No camera observations recorded.";
  }
  return observations.map((obs) => `- ${obs}`).join("\n");
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
    "Use the Speech Brief (Audience (your POV), Purpose, Time Limit, and any Speaker Notes) " +
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

function formatWebSourcesBlock(sources?: RawResearchSource[]): string {
  if (!sources || sources.length === 0) return "";
  const formatted = sources
    .map((s, i) => `[${i + 1}] ${s.title}: ${s.description || "(No snippet)"}`)
    .join("\n");
  return `\n\nLive Web Research (from Bright Data):\n${formatted}`;
}

/**
 * Extracts a focused 4-8 word Google search query from the SpeechBrief and transcript
 * so Bright Data can retrieve real-world statistics, priorities, or counterarguments.
 */
export async function buildSearchQueryFromSpeech(
  brief: SpeechBrief,
  transcript: string
): Promise<string> {
  const contextBlock = formatSpeechBriefContext(brief);
  const trimmedTranscript = transcript.trim();

  const prompt =
    `Speech Brief:\n${contextBlock}\n\n` +
    (trimmedTranscript
      ? `Spoken Transcript:\n"${trimmedTranscript}"\n\n`
      : "") +
    `Write a single concise Google search query (4 to 8 words, no quotes or operators) ` +
    `to find real-world statistics, audience concerns, or counterarguments relevant to this speech.`;

  const query = (
    await generateText(
      prompt,
      "Return only the plain search query text, nothing else."
    )
  )
    .replace(/["\n\r]/g, " ")
    .trim();

  if (query.length > 0) return query;
  return `${brief.audience} ${brief.notes?.slice(0, 60) || brief.purpose} statistics`;
}

/**
 * Distills Bright Data search results into 3-4 concise audience insights and supporting facts
 * for the Normal Mode Setup assistant.
 */
export async function distillAudiencePrep(
  audience: string,
  purpose: string,
  notes: string,
  sources: RawResearchSource[]
): Promise<string[]> {
  if (sources.length === 0) return [];

  const sourceList = sources
    .map((s, i) => `[${i + 1}] ${s.title}\nSnippet: ${s.description || "(No snippet)"}`)
    .join("\n\n");

  const prompt =
    `Audience (this is the POV you take): ${audience}\nPurpose: ${purpose}\n` +
    (notes.trim() ? `Speaker's Current Notes:\n${notes.trim()}\n\n` : "\n") +
    `Web Search Results:\n${sourceList}\n\n` +
    `Provide 3 to 4 crisp, actionable bullets for the speaker before they begin: ` +
    `what this audience cares most about, 1-2 useful facts or statistics they can cite, ` +
    `and 1 likely question or objection to prepare for. Keep each bullet to 1 sentence.`;

  const response = await ai.models.generateContent({
    model: config.defaultGeminiModel,
    contents: prompt,
    config: {
      systemInstruction:
        "You are an executive speech coach helping a speaker tailor their talk to a specific audience using real web research.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["insights"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as { insights?: string[] };
  return (parsed.insights ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 4);
}

/**
 * Generates the Q&A Questions array for the HostBrain service using the SpeechBrief
 * (Audience, Purpose, Time Limit, and optional Notes), the Delivery Recording,
 * and optional live Bright Data web research.
 */
export async function generateHostQuestions(
  brief: SpeechBrief,
  delivery: Recording,
  webSources?: RawResearchSource[]
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

  const webBlock = formatWebSourcesBlock(webSources);

  const prompt =
    `Speech Brief:\n${contextBlock}\n\n` +
    `${transcriptBlock}` +
    `${bodyLanguageBlock}` +
    `${webBlock}\n\n` +
    `Return a JSON object with a "questions" array containing exactly ${QUESTION_COUNT} concise, natural-sounding follow-up questions tailored to the target audience, purpose, time limit${brief.notes?.trim() ? ", and the speaker's notes" : ""}` +
    `${webSources && webSources.length > 0 ? ", grounded in the real-world facts or counterarguments from the live web research when relevant" : ""}.`;

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
 * Audience, Purpose, Time Limit, and optional Notes (in Normal Mode) or Topic Briefing (in Improv Mode),
 * plus optional live Bright Data sources for content improvement suggestions.
 */
export async function generateHostReflection(
  input: ReflectionInput,
  webSources?: RawResearchSource[],
  priorSessionSummaries?: string[]
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

  const bodyLanguageBlock = formatBodyLanguageContext(
    input.delivery.bodyLanguageObservations
  );

  const vocalTelemetryBlock = formatVocalMetricsContext(input.delivery.vocalMetrics);
  const hasAudioAttachment = Boolean(
    input.delivery.audioBase64 && input.delivery.audioMimeType
  );
  const webBlock = formatWebSourcesBlock(webSources);
  const priorHistoryBlock =
    priorSessionSummaries && priorSessionSummaries.length > 0
      ? `\n\nPrior Practice Sessions History (from Neon Postgres):\n- ${priorSessionSummaries.join("\n- ")}`
      : "";

  const prompt =
    `${contextSection}\n\n` +
    `Delivery Transcript:\n"${input.delivery.transcript}"\n\n` +
    `Measured Vocal Delivery & Acoustic Telemetry (from ElevenLabs STT + Microphone Audio):\n${vocalTelemetryBlock}\n\n` +
    `Measured Camera & Body Language Telemetry (OpenCV YuNet Gaze + MobileFaceNet Expressions + MediaPipe Hand Gestures):\n${bodyLanguageBlock}` +
    `${webBlock}` +
    `${priorHistoryBlock}\n\n` +
    `Provide a structured coaching reflection evaluating how well the speaker met their audience, purpose, time limit, and notes/speaking points. ` +
    `In "bodyLanguage" (and the spoken "summary"), specifically ground your strengths and improvements in the camera and gesture telemetry above: evaluate their eye contact and gaze direction (percentage of time looking straight at the camera vs. looking down at notes or away), facial expression warmth/variety (e.g., Happy, Neutral, Surprised), hand gesture usage and visibility (e.g., Open Palm vs. Closed Fist/Pointing, deliberate gesture movement rate per minute, and whether hands were clasped/held close together or kept out of frame), and any timestamped shifts. ` +
    `In "voiceAndDelivery" (and the spoken "summary"), specifically reflect on their vocal inflection (${input.delivery.vocalMetrics?.inflectionVariety ?? "pitch variety"}), ` +
    `volume projection (${input.delivery.vocalMetrics?.volumeLevel ?? "volume"} / ${input.delivery.vocalMetrics?.volumeDynamics ?? "dynamics"}), ` +
    `speaking pace (${input.delivery.vocalMetrics?.wordsPerMinute ?? "WPM"} WPM, ${input.delivery.vocalMetrics?.pauseCount ?? 0} pauses), and filler words` +
    `${hasAudioAttachment ? ", combining the measured telemetry with what you hear directly in the attached speech audio" : ""}.` +
    `${webSources && webSources.length > 0 ? " When suggesting content improvements, reference relevant evidence or angles from the live web research." : ""}` +
    `${priorSessionSummaries && priorSessionSummaries.length > 0 ? " Where relevant, acknowledge progress or recurring habits compared to their prior practice sessions." : ""}`;

  const sectionSchema = {
    type: Type.OBJECT,
    properties: {
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        minItems: String(REFLECTION_POINTS.min),
        maxItems: String(REFLECTION_POINTS.max),
      },
      improvements: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        minItems: String(REFLECTION_POINTS.min),
        maxItems: String(REFLECTION_POINTS.max),
      },
    },
    required: ["strengths", "improvements"],
  };

  const generationConfig = {
    systemInstruction:
      "You are a supportive, insightful public speaking coach. " +
      "Analyze the speech transcript, the camera & gesture telemetry (OpenCV YuNet gaze direction/eye contact, MobileFaceNet facial expressions, and MediaPipe hand gesture classifications, movement frequency, and hand proximity/clasping), and the vocal delivery data (plus attached audio when provided) for vocal inflection, tone, volume dynamics, speaking pace, pauses, and filler words. " +
      "In the `bodyLanguage` section, cite specific observations from both the OpenCV facial/gaze telemetry and the parsed hand-gesture metrics (such as eye-contact percentage, facial expressions, hand visibility, open-palm vs. closed-fist gestures, gesture movement pacing, and hand clasping) rather than generic advice when camera data is present. " +
      "Return a structured JSON reflection with a spoken `summary` (2-3 natural sentences suitable for text-to-speech, with no numeric grades/scores) " +
      `and, for each of \`bodyLanguage\`, \`voiceAndDelivery\`, and \`content\`, between ${REFLECTION_POINTS.min} and ${REFLECTION_POINTS.max} strengths and between ${REFLECTION_POINTS.min} and ${REFLECTION_POINTS.max} improvements. ` +
      "Give as many points as the speech genuinely warrants: each one distinct and specific, never padded or repeated to fill a count. " +
      "The number of strengths and improvements in a section need not match.",
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
  };

  let responseText: string | undefined;

  if (input.delivery.audioBase64 && input.delivery.audioMimeType) {
    try {
      const response = await ai.models.generateContent({
        model: config.defaultGeminiModel,
        contents: [
          {
            inlineData: {
              data: input.delivery.audioBase64,
              mimeType: input.delivery.audioMimeType,
            },
          },
          prompt,
        ],
        config: generationConfig,
      });
      responseText = response.text;
    } catch (audioErr) {
      console.warn("Multimodal audio reflection fallback to text+telemetry:", audioErr);
    }
  }

  if (!responseText) {
    const response = await ai.models.generateContent({
      model: config.defaultGeminiModel,
      contents: prompt,
      config: generationConfig,
    });
    responseText = response.text;
  }

  const reflection = JSON.parse(responseText ?? "{}") as Reflection;
  if (webSources && webSources.length > 0) {
    reflection.sources = webSources.slice(0, 3).map((s) => ({
      title: s.title,
      url: s.url,
    }));
  }
  return reflection;
}

export interface RawResearchSource {
  title: string;
  description: string;
  url: string;
}

/**
 * Uses Gemini to parse raw Bright Data SERP results into 4-5 neat, speakable
 * talking points (facts, supporting arguments, and a counterargument) for Improv Mode.
 */
export async function distillTopicSpeakingPoints(
  topic: string,
  sources: RawResearchSource[]
): Promise<string[]> {
  if (sources.length === 0) return [];

  const sourceList = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nSnippet: ${s.description || "(No snippet)"}\nURL: ${s.url}`
    )
    .join("\n\n");

  const prompt =
    `Improv/Debate Topic: "${topic}"\n\n` +
    `Web Search Results:\n${sourceList}\n\n` +
    `Turn these search results into 4-5 concise, speakable talking points for a 2-minute impromptu speech. ` +
    `Include key facts/evidence, a strong supporting angle, and 1 counterargument or nuance to address. ` +
    `Keep each point to 1 clear sentence without markdown or citations.`;

  const response = await ai.models.generateContent({
    model: config.defaultGeminiModel,
    contents: prompt,
    config: {
      systemInstruction:
        "You are a debate and public speaking coach. Distill raw web search snippets into neat, " +
        "conversational, well-balanced talking points that a speaker can glance at and use immediately.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          speakingPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["speakingPoints"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as { speakingPoints?: string[] };
  return (parsed.speakingPoints ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 5);
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
