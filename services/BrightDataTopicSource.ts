import { getImprovBriefingAction } from "@/app/actions/topicSource";
import type { TopicBriefing } from "@/domain/types";
import type { TopicSource } from "./TopicSource";
import { FakeTopicSource } from "./fakes/FakeTopicSource";

/**
 * Live TopicSource backed by Bright Data SERP scraping + Gemini distillation,
 * with automatic fallback to FakeTopicSource if Bright Data credentials are not set.
 */
export class BrightDataTopicSource implements TopicSource {
  private readonly fallback = new FakeTopicSource();

  async getTopicBriefing(): Promise<TopicBriefing> {
    try {
      const briefing = await getImprovBriefingAction();
      if (briefing && briefing.speakingPoints.length > 0) {
        return briefing;
      }
    } catch (error) {
      console.error("BrightDataTopicSource error, falling back to FakeTopicSource:", error);
    }
    return this.fallback.getTopicBriefing();
  }
}
