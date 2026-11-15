
import { getRandomTopic } from "./improv-topics.ts";
import { getTrendingTopic } from "./trending-topics.ts";
import { researchTopic } from "./brightdata.ts";

import {
  generateSpeakingPoints,
  type SpeakingPoint
} from "./improv-summary.ts";

// The two available topic-generation modes.
export type ImprovMode = "classic" | "trending";

// Background information retrieved from Bright Data.
interface BackgroundInfo {
  title: string;
  description: string;
  url: string;
}

// Everything the frontend receives.
interface ImprovPrep {
  topic: string;
  topicMode: ImprovMode;
  preparationSeconds: number;
  backgroundInfo: BackgroundInfo[];
  speakingPoints: string[];
  sourceBackedPoints: SpeakingPoint[];
  researchAvailable: boolean;
  summaryAvailable: boolean;
}

// Create an Improv Mode preparation session.
export async function createImprovPrep(
  mode: ImprovMode = "classic"
): Promise<ImprovPrep> {

  // Step 1: Generate a topic based on the selected mode.
  let topic: string;
  let topicMode: ImprovMode = mode;

  if (mode === "trending") {
    try {
      topic = await getTrendingTopic();
    } catch (error) {
      console.warn(
        "Trending topic unavailable. Using classic topic.",
        error
      );

      topic = getRandomTopic();
      topicMode = "classic";
    }
  } else {
    topic = getRandomTopic();
  }

  // Step 2: Create a fallback session.
  const fallback: ImprovPrep = {
    topic,
    topicMode,
    preparationSeconds: 60,
    backgroundInfo: [],
    speakingPoints: [],
    sourceBackedPoints: [],
    researchAvailable: false,
    summaryAvailable: false
  };

  // Step 3: Retrieve background research.
  let backgroundInfo: BackgroundInfo[];

  try {
    const research = await researchTopic(topic);

    backgroundInfo = research.sources
      .filter(source => source.description.trim())
      .slice(0, 3);

  } catch (error) {
    console.error("Bright Data research failed:", error);
    return fallback;
  }

  if (backgroundInfo.length === 0) {
    return fallback;
  }

  // Step 4: Ask Gemini to create speaking points.
  let sourceBackedPoints: SpeakingPoint[] = [];

  try {
    sourceBackedPoints = await generateSpeakingPoints(
      topic,
      backgroundInfo
    );
  } catch (error) {
    console.error("Gemini summary failed:", error);
  }

  // Step 5: Return the preparation session.
  return {
    topic,
    topicMode,
    preparationSeconds: 60,
    backgroundInfo,
    speakingPoints: sourceBackedPoints.map(
      point => point.text
    ),
    sourceBackedPoints,
    researchAvailable: true,
    summaryAvailable: sourceBackedPoints.length > 0
  };
}