// Domain types. Names follow GLOSSARY.md.

export type Mode = "normal" | "improv";

export type Purpose = "inform" | "persuade" | "entertain" | "other";

/** The Speaker's structured description of their speech, given before a Normal Mode Session. */
export interface SpeechBrief {
  audience: string;
  purpose: Purpose;
  /** Whole minutes, 1–30. */
  timeLimitMinutes: number;
  /** Optional notes or script. */
  notes?: string;
}

export interface TopicSourceLink {
  title: string;
  url: string;
}

/** The randomly chosen topic and its Speaking Points, given before an Improv Mode Session. */
export interface TopicBriefing {
  topic: string;
  speakingPoints: string[];
  sources?: TopicSourceLink[];
}

export interface VocalDeliveryMetrics {
  durationSeconds: number;
  wordsPerMinute: number;
  paceLabel: "slow" | "conversational" | "fast";
  volumeLevel: "quiet" | "balanced" | "loud";
  volumeDynamics: "flat" | "moderate" | "dynamic";
  inflectionVariety: "monotone" | "natural" | "expressive";
  pitchRangeHz: number;
  pauseCount: number;
  fillerWordCount: number;
  detectedFillers: string[];
}

/** What SpeechCapture returns when capture stops. */
export interface Recording {
  transcript: string;
  bodyLanguageObservations: string[];
  vocalMetrics?: VocalDeliveryMetrics;
  audioBase64?: string;
  audioMimeType?: string;
}

/** The Host's scripted lines that frame a Session. */
export type FormalityKind = "greeting" | "qaHandoff" | "closing";

/** An impromptu question the Host asks during Q&A. */
export interface Question {
  id: string;
  text: string;
}

export interface ReflectionSection {
  strengths: string[];
  improvements: string[];
}

/** The feedback at the end of every Session. Both Modes use the same shape. */
export interface Reflection {
  summary: string;
  bodyLanguage: ReflectionSection;
  voiceAndDelivery: ReflectionSection;
  content: ReflectionSection;
  sources?: TopicSourceLink[];
}

export interface PracticeSessionSummary {
  id: number;
  mode: Mode;
  topicOrAudience: string;
  purpose: string | null;
  vocalMetrics: VocalDeliveryMetrics | null;
  reflection: Reflection;
  createdAt: string;
}

export interface PracticeSessionDetail extends PracticeSessionSummary {
  deliveryTranscript: string;
  bodyLanguage: string[];
  qaAnswers: string[] | null;
}
