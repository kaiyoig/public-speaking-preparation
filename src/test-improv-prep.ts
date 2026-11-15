import { createImprovPrep } from "./improv-prep.ts";

async function main() {

  const session = await createImprovPrep("trending");
  console.log("Topic Mode:", session.topicMode);

  console.log("=== IMPROV MODE ===");

  console.log("\nTopic:", session.topic);

  console.log(
    "Preparation Time:",
    session.preparationSeconds,
    "seconds"
  );

  // Display AI-generated speaking points.
  if (session.summaryAvailable) {

    console.log("\n=== AI SPEAKING POINTS ===");

    session.sourceBackedPoints.forEach((point, index) => {
      console.log(`\nPoint ${index + 1}:`);
      console.log(point.text);
      console.log("Source:", point.sourceTitle);
      console.log("URL:", point.sourceUrl);
    });

  } else {
    console.log("\nAI speaking points unavailable.");
  }

  // Display original research snippets.
  if (session.researchAvailable) {

    console.log("\n=== ORIGINAL RESEARCH ===");

    session.backgroundInfo.forEach((source, index) => {
      console.log(`\nSource ${index + 1}:`);
      console.log("Title:", source.title);
      console.log("Description:", source.description);
      console.log("URL:", source.url);
    });

  } else {
    console.log("\nBackground research unavailable.");
  }
}

main().catch(console.error);