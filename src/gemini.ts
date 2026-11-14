import { GoogleGenAI } from "@google/genai";
import { getConfig } from "./config.ts";

const config = getConfig();

export const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

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
 * Generates an impromptu follow-up question based on the speaker's pre-speech context
 * and what they have said so far.
 */
export async function generateImpromptuQuestion(
  speechContext: string,
  transcript: string
): Promise<string> {
  const systemInstruction =
    "You are an attentive public speaking coach and audience member. " +
    "Ask a single concise, natural-sounding follow-up question (1-2 sentences) " +
    "about the speaker's talk based on their context and transcript. " +
    "Write it so it sounds natural when spoken aloud via text-to-speech.";

  const prompt = `Speech Context: ${speechContext}\n\nTranscript so far:\n"${transcript}"\n\nAsk one follow-up question:`;
  return generateText(prompt, systemInstruction);
}

/**
 * Generates an end-of-speech reflection highlighting strengths and areas for improvement,
 * formatted to be spoken aloud by ElevenLabs.
 */
export async function generateSpeechReflection(
  speechContext: string,
  transcript: string
): Promise<string> {
  const systemInstruction =
    "You are a supportive and constructive public speaking coach. " +
    "Provide a short spoken reflection (3-4 sentences) highlighting what went well " +
    "and 1-2 specific areas to improve. Avoid markdown bullet points or special symbols " +
    "so that the response can be read directly by a text-to-speech engine.";

  const prompt = `Speech Context: ${speechContext}\n\nFull Speech Transcript:\n"${transcript}"\n\nProvide your spoken coaching reflection:`;
  return generateText(prompt, systemInstruction);
}

// Run standalone starter check if executed directly: `npm run gemini`
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const sampleReply = await generateText(
    "Give me one quick tip for calming nerves before a public speech in two sentences."
  );
  console.log("Gemini response:\n", sampleReply);
}
