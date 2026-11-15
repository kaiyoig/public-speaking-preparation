import type { TopicBriefing } from "@/domain/types";
import type { TopicSource } from "../TopicSource";
import { fakeLatency, pickRandom } from "./delay";

const CANNED_TOPIC_BRIEFINGS: readonly TopicBriefing[] = [
  {
    topic: "The history of the bicycle",
    speakingPoints: [
      "The first two-wheeled 'running machine' was built by Karl Drais in 1817 and had no pedals.",
      "Pneumatic tires, popularized by John Boyd Dunlop in 1888, made cycling far more comfortable.",
      "Bicycles gave many women in the 1890s new independence and influenced dress reform.",
      "Today there are estimated to be over a billion bicycles in the world.",
    ],
  },
  {
    topic: "Why we sleep",
    speakingPoints: [
      "Adults typically need seven to nine hours of sleep per night.",
      "During deep sleep the brain clears waste products that build up while awake.",
      "REM sleep is linked to memory consolidation and emotional processing.",
      "Screens before bed can delay the release of melatonin.",
      "Chronic sleep loss is associated with weaker immune function.",
    ],
  },
  {
    topic: "Urban beekeeping",
    speakingPoints: [
      "Cities such as Paris and London have thousands of rooftop hives.",
      "Urban bees can benefit from the variety of plants in parks and gardens.",
      "Too many hives in one area can compete with wild pollinators for food.",
    ],
  },
  {
    topic: "The deep ocean",
    speakingPoints: [
      "More than 80% of the ocean remains unmapped in high resolution.",
      "The Mariana Trench reaches nearly 11,000 metres below sea level.",
      "Many deep-sea creatures produce their own light through bioluminescence.",
      "Hydrothermal vents support ecosystems that do not depend on sunlight.",
    ],
  },
  {
    topic: "Learning a second language as an adult",
    speakingPoints: [
      "Adults often learn grammar and vocabulary faster than children at first.",
      "Spaced repetition helps move new words into long-term memory.",
      "Speaking early, even imperfectly, builds confidence and fluency.",
      "Bilingualism has been linked to stronger attention control.",
    ],
  },
];

/** Fake Topic Briefings: a random pick from a canned list, whatever the Topic Kind. */
export class FakeTopicSource implements TopicSource {
  async getTopicBriefing(): Promise<TopicBriefing> {
    await fakeLatency();
    return pickRandom(CANNED_TOPIC_BRIEFINGS);
  }
}
