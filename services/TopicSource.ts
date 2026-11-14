import type { TopicBriefing } from "@/domain/types";

/**
 * Picks a random topic and gathers Speaking Points for Improv Mode.
 *
 * Owner: Andrew (Improv Mode, webscraping).
 *
 * Contract:
 * - `getTopicBriefing()` resolves with a fresh, randomly chosen Topic Briefing
 *   on every call, with a handful of Speaking Points.
 * - Rejects with an Error whose message can be shown to the Speaker.
 */
export interface TopicSource {
  getTopicBriefing(): Promise<TopicBriefing>;
}
