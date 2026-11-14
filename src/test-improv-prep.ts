import { createImprovPrep } from "./improv-prep.ts";

async function main() {

  const session = await createImprovPrep();

  console.log("=== IMPROV MODE ===");

  console.log("Topic:", session.topic);

  console.log(
    "Preparation time:",
    session.preparationSeconds,
    "seconds"
  );

  if (!session.researchAvailable) {
    console.log("Background research unavailable.");
    return;
  }

  console.log("\nBackground Information:");

  session.backgroundInfo.forEach((info, index) => {
    console.log(`\nSource ${index + 1}`);
    console.log("Title:", info.title);
    console.log("Description:", info.description);
    console.log("URL:", info.url);
  });
}

main().catch(console.error);