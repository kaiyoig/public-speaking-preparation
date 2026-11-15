
import { getRandomTopic } from "./improv-topics.ts";
import { researchTopic } from "./brightdata.ts";
import {
  generateSpeakingPoints,
  type SpeakingPoint
} from "./improv-summary.ts";

// Background research from Bright Data.
interface BackgroundInfo {
  title: string;
  description: string;
  url: string;
}

// Everything the frontend needs.
interface ImprovPrep {
  topic: string;
  preparationSeconds: number;
  backgroundInfo: BackgroundInfo[];
  speakingPoints: string[];
  sourceBackedPoints: SpeakingPoint[];
  researchAvailable: boolean;
  summaryAvailable: boolean;
}

// Create an Improv Mode preparation session.
export async function createImprovPrep(): Promise<ImprovPrep> {

  // Step 1: Generate a random topic.
  const topic = getRandomTopic();

  // Default session if research is unavailable.
  const fallback: ImprovPrep = {
    topic: topic,
    preparationSeconds: 60,
    backgroundInfo: [],
    speakingPoints: [],
    sourceBackedPoints: [],
    researchAvailable: false,
    summaryAvailable: false
  };

  // Step 2: Retrieve background information.
  let backgroundInfo: BackgroundInfo[];

  try {
    const research = await researchTopic(topic);

    backgroundInfo = research.sources
      .filter(source => source.description.trim())
      .slice(0, 3);

  } catch (error) {
    console.error("Bright Data error:", error);

    // Improv Mode can still show the topic.
    return fallback;
  }

  if (backgroundInfo.length === 0) {
    return fallback;
  }

  // Step 3: Generate concise speaking points.
  let sourceBackedPoints: SpeakingPoint[] = [];

  try {
    sourceBackedPoints = await generateSpeakingPoints(
      topic,
      backgroundInfo
    );

  } catch (error) {
    console.error("Gemini summary error:", error);
  }

  // Step 4: Return everything to the frontend.
  return {
    topic: topic,
    preparationSeconds: 60,
    backgroundInfo: backgroundInfo,
    speakingPoints: sourceBackedPoints.map(
      point => point.text
    ),
    sourceBackedPoints: sourceBackedPoints,
    researchAvailable: true,
    summaryAvailable: sourceBackedPoints.length > 0
  };
}