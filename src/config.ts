import "dotenv/config";

export interface AppConfig {
  geminiApiKey: string;
  elevenLabsApiKey: string;
  defaultGeminiModel: string;
  defaultElevenLabsVoiceId: string;
  defaultElevenLabsModelId: string;
}

export function getConfig(): AppConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY ?? "";
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ?? "";

  if (!geminiApiKey || geminiApiKey === "your_gemini_api_key_here") {
    console.warn("Warning: GEMINI_API_KEY is missing or still set to the placeholder in .env");
  }

  if (!elevenLabsApiKey || elevenLabsApiKey === "your_elevenlabs_api_key_here") {
    console.warn("Warning: ELEVENLABS_API_KEY is missing or still set to the placeholder in .env");
  }

  return {
    geminiApiKey,
    elevenLabsApiKey,
    defaultGeminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    defaultElevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "c6SfcYrb2t09NHXiT80T",
    defaultElevenLabsModelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
  };
}
