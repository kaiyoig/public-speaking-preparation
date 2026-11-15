import type { TopicBriefing, TopicKind } from "@/domain/types";

/**
 * Picks a topic of the chosen Topic Kind and gathers Speaking Points for Improv Mode.
 *
 * Owner: Andrew (Improv Mode, webscraping).
 *
 * Contract:
 * - `getTopicBriefing(kind)` resolves with a fresh Topic Briefing on every call,
 *   with a handful of Speaking Points.
 * - `"classic"` picks from a fixed list of topics; `"trending"` writes a new topic
 *   from recent news headlines.
 * - Rejects with an Error whose message can be shown to the Speaker.
 */
export interface TopicSource {
  getTopicBriefing(kind: TopicKind): Promise<TopicBriefing>;
}
