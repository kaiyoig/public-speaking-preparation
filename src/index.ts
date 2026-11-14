import { generateImpromptuQuestion, generateSpeechReflection } from "./gemini.ts";
import { saveSpeechToFile } from "./elevenlabs.ts";

async function runStarterWorkflow() {
  const sampleContext =
    "A 3-minute persuasive pitch to university students about reducing food waste in campus dining halls.";
  const sampleTranscript =
    "Every day, thousands of pounds of edible food are thrown out across our campus dining halls. " +
    "By introducing portion-choice serving lines and a nightly surplus food pickup app for students, " +
    "we can cut dining hall waste by forty percent within one quarter.";

  console.log("=== Public Speaking Coach Starter Workflow ===\n");
  console.log("Speech Context:", sampleContext);
  console.log("Sample Transcript:", sampleTranscript, "\n");

  // Step 1: Generate an impromptu follow-up question with Gemini
  console.log("1. Generating impromptu question with Gemini...");
  const question = await generateImpromptuQuestion(sampleContext, sampleTranscript);
  console.log(`   Gemini Question: "${question.trim()}"\n`);

  // Step 2: Voice the impromptu question with ElevenLabs
  const questionAudioPath = "./output/impromptu-question.mp3";
  console.log("2. Synthesizing question audio with ElevenLabs...");
  await saveSpeechToFile(question, questionAudioPath);
  console.log(`   Saved audio to: ${questionAudioPath}\n`);

  // Step 3: Generate an end-of-speech coaching reflection with Gemini
  console.log("3. Generating speech reflection with Gemini...");
  const reflection = await generateSpeechReflection(sampleContext, sampleTranscript);
  console.log(`   Gemini Reflection: "${reflection.trim()}"\n`);

  // Step 4: Voice the coaching reflection with ElevenLabs
  const reflectionAudioPath = "./output/speech-reflection.mp3";
  console.log("4. Synthesizing reflection audio with ElevenLabs...");
  await saveSpeechToFile(reflection, reflectionAudioPath);
  console.log(`   Saved audio to: ${reflectionAudioPath}\n`);

  console.log("Workflow complete!");
}

runStarterWorkflow().catch((err) => {
  console.error("Workflow error:", err);
  process.exitCode = 1;
});
