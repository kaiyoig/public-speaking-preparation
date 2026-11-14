import { QUESTION_COUNT } from "@/domain/config";
import type {
  FormalityKind,
  Mode,
  Question,
  Recording,
  Reflection,
  SpeechBrief,
} from "@/domain/types";
import type { HostBrain, ReflectionInput } from "../HostBrain";
import { fakeLatency, wait } from "./delay";

const FORMALITIES: Record<Mode, Record<FormalityKind, string>> = {
  normal: {
    greeting: "Hello, and welcome. Whenever you're ready, the floor is yours.",
    qaHandoff: "Thank you for that. I have a few questions for you, if that's all right.",
    closing: "That's all my questions. Thank you, let's look at how it went.",
  },
  improv: {
    greeting: "Welcome! You've seen your topic. Take a breath, and begin when you're ready.",
    qaHandoff: "Thank you. Let's move on.",
    closing: "Nicely done. Let's look at how it went.",
  },
};

const MS_PER_CHARACTER = 60;

/** Fake Host: canned Formalities, Questions and Reflection; speaking is simulated with a timer. */
export class FakeHostBrain implements HostBrain {
  async getFormality(kind: FormalityKind, mode: Mode): Promise<string> {
    await fakeLatency();
    return FORMALITIES[mode][kind];
  }

  async getQuestions(brief: SpeechBrief, _delivery: Recording): Promise<Question[]> {
    await fakeLatency();
    const audience = brief.audience.trim() || "your audience";
    const questions = [
      `How do you expect ${audience} to put your main point into practice?`,
      `What was the hardest part of this speech to tailor for ${audience}?`,
      `If someone from ${audience} disagreed with you, what would you say to them?`,
      `Which example from your speech do you think will stay with ${audience} the longest?`,
    ];
    return questions.slice(0, QUESTION_COUNT).map((text, index) => ({ id: `q${index + 1}`, text }));
  }

  async getReflection(input: ReflectionInput): Promise<Reflection> {
    await fakeLatency();
    const summary =
      input.mode === "normal"
        ? "A confident, well-structured speech with a clear message. Your answers in Q&A were thoughtful. " +
          "The biggest gains now are in using your hands more and cutting filler words."
        : `You found your footing quickly on "${input.topicBriefing.topic}" and used your Speaking Points well. ` +
          "Next time, aim for a clearer closing line and fewer pauses while you search for the next point.";
    return {
      summary,
      bodyLanguage: {
        strengths: ["Steady eye contact with the camera", "Natural smile at the opening"],
        improvements: [
          "Bring your hands into view and use them to mark key points",
          "Plant your feet rather than shifting your weight",
        ],
      },
      voiceAndDelivery: {
        strengths: ["Clear, audible voice throughout", "Good pace in the opening"],
        improvements: [
          'Cut filler words such as "um" and "so"',
          "Pause briefly after each key point to let it land",
        ],
      },
      content: {
        strengths:
          input.mode === "normal"
            ? ["Clear structure that suited the audience", "Memorable personal example"]
            : ["Used concrete facts from the Speaking Points", "Kept to a single clear theme"],
        improvements: [
          "State your main point in the first thirty seconds",
          "End with a short, memorable closing line",
        ],
      },
    };
  }

  async speak(text: string): Promise<void> {
    await wait(text.length * MS_PER_CHARACTER);
  }
}
