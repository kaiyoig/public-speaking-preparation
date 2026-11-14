import type {
  FormalityKind,
  Mode,
  Question,
  Recording,
  Reflection,
  SpeechBrief,
  TopicBriefing,
} from "@/domain/types";

export type ReflectionInput =
  | { mode: "normal"; brief: SpeechBrief; delivery: Recording; answers: Recording[] }
  | { mode: "improv"; topicBriefing: TopicBriefing; delivery: Recording };

/**
 * Everything the Host thinks and says.
 *
 * Owner: Ethan (Gemini, ElevenLabs).
 *
 * Contract:
 * - `getFormality(kind, mode)` resolves with the Host's line for that Formality.
 * - `getQuestions(brief, delivery)` resolves with the Questions for Q&A, based on
 *   the Speech Brief and what the Speaker said during Delivery.
 * - `getReflection(input)` resolves with the Reflection for the Session.
 * - `speak(text)` voices the line and resolves when the Host finishes speaking.
 * - Every method rejects with an Error whose message can be shown to the Speaker.
 */
export interface HostBrain {
  getFormality(kind: FormalityKind, mode: Mode): Promise<string>;
  getQuestions(brief: SpeechBrief, delivery: Recording): Promise<Question[]>;
  getReflection(input: ReflectionInput): Promise<Reflection>;
  speak(text: string): Promise<void>;
}
