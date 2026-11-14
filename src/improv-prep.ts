import { getRandomTopic } from "./improv-topics.ts";
import { researchTopic } from "./brightdata.ts";

// Define one piece of background information.
interface BackgroundInfo {
  title: string;
  description: string;
  url: string;
}

// Define the complete preparation session.
interface ImprovPrep {
  topic: string;
  preparationSeconds: number;
  backgroundInfo: BackgroundInfo[];
  researchAvailable: boolean;
}

// Create an improv preparation session.
export async function createImprovPrep(): Promise<ImprovPrep> {

  // Step 1: Choose a random speaking topic.
  const topic = getRandomTopic();

  // Step 2: Retrieve research about the topic.
  try {
    const research = await researchTopic(topic);

    // Step 3: Keep up to three usable research snippets.
    const backgroundInfo = research.sources
      .filter(source => source.description.trim().length > 0)
      .slice(0, 3)
      .map(source => ({
        title: source.title,
        description: source.description,
        url: source.url
      }));

    // Step 4: Return information for the frontend.
    return {
      topic: topic,
      preparationSeconds: 60,
      backgroundInfo: backgroundInfo,
      researchAvailable: backgroundInfo.length > 0
    };

  } catch (error) {

    // If Bright Data fails, Improv Mode can still work.
    console.error("Research unavailable:", error);

    return {
      topic: topic,
      preparationSeconds: 60,
      backgroundInfo: [],
      researchAvailable: false
    };
  }
}