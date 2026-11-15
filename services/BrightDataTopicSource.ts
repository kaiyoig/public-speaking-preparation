import { getImprovBriefingAction } from "@/app/actions/topicSource";
import type { TopicBriefing, TopicKind } from "@/domain/types";
import type { TopicSource } from "./TopicSource";
import { FakeTopicSource } from "./fakes/FakeTopicSource";

/**
 * Live TopicSource backed by Bright Data SERP scraping + Gemini distillation.
 * Classic topics fall back to FakeTopicSource if the live path is unavailable.
 * Trending topics have no fallback: a canned topic isn't trending, so the Speaker is told instead.
 */
export class BrightDataTopicSource implements TopicSource {
  private readonly fallback = new FakeTopicSource();

  async getTopicBriefing(kind: TopicKind): Promise<TopicBriefing> {
    try {
      const briefing = await getImprovBriefingAction(kind);
      if (briefing && briefing.speakingPoints.length > 0) {
        return briefing;
      }
    } catch (error) {
      console.error(`BrightDataTopicSource (${kind}) error:`, error);
    }
    if (kind === "trending") {
      throw new Error("Couldn’t find a trending topic right now. Try again, or choose a classic topic.");
    }
    return this.fallback.getTopicBriefing();
  }
}
