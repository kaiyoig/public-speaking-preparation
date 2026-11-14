import { researchTopic } from "./brightdata.ts";
import { getRandomTopic } from "./improv-topics.ts";

async function main() {
  // Generate a random speaking topic.
  const topic = getRandomTopic();

  console.log("Random Improv Topic:", topic);

  // Use Bright Data to research the topic.
  const results = await researchTopic(topic);

  // Display the results.
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
