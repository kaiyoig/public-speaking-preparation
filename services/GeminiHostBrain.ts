import {
  generateQuestionsAction,
  generateReflectionAction,
  synthesizeSpeechBase64Action,
} from "@/app/actions/hostBrain";
import type {
  FormalityKind,
  Mode,
  Question,
  Recording,
  Reflection,
  SpeechBrief,
} from "@/domain/types";
import type { HostBrain, ReflectionInput } from "./HostBrain";
import { FakeHostBrain } from "./fakes/FakeHostBrain";

/**
 * Real HostBrain implementation backed by Gemini (for Questions & Reflections)
 * and ElevenLabs (for browser audio playback), with automatic fallback to FakeHostBrain
 * if API keys are not configured.
 */
export class GeminiHostBrain implements HostBrain {
  private readonly fallback = new FakeHostBrain();
  private readonly audioCache = new Map<string, Promise<string | null>>();
  private activeAudio: HTMLAudioElement | null = null;

  async getFormality(kind: FormalityKind, mode: Mode): Promise<string> {
    return this.fallback.getFormality(kind, mode);
  }

  async getQuestions(brief: SpeechBrief, delivery: Recording): Promise<Question[]> {
    const questions = await generateQuestionsAction(brief, delivery);
    if (questions && questions.length > 0) {
      return questions;
    }
    return this.fallback.getQuestions(brief, delivery);
  }

  async getReflection(input: ReflectionInput): Promise<Reflection> {
    const reflection = await generateReflectionAction(input);
    if (reflection) {
      return reflection;
    }
    return this.fallback.getReflection(input);
  }

  async speak(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Stop any previous audio still playing (e.g. from React StrictMode double-effect)
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }

    try {
      let audioPromise = this.audioCache.get(trimmed);
      if (!audioPromise) {
        audioPromise = synthesizeSpeechBase64Action(trimmed).catch((err) => {
          this.audioCache.delete(trimmed);
          throw err;
        });
        this.audioCache.set(trimmed, audioPromise);
      }

      const base64Audio = await audioPromise;
      if (base64Audio && typeof window !== "undefined") {
        await this.playBase64AudioInBrowser(base64Audio);
        return;
      }
    } catch (error) {
      console.error("ElevenLabs TTS playback error, falling back to timer:", error);
    }

    await this.fallback.speak(trimmed);
  }

  private playBase64AudioInBrowser(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
      this.activeAudio = audio;

      const cleanup = () => {
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error("Audio playback failed"));
      };
      audio.play().catch((err) => {
        cleanup();
        reject(err);
      });
    });
  }
}
