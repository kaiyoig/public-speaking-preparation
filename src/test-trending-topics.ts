
import { getTrendingTopic } from "./trending-topics.ts";

async function main() {
  console.log("=== TRENDING TOPIC TEST ===");

  const topic = await getTrendingTopic();

  console.log("\nGenerated Topic:", topic);
}

main().catch(console.error);