const topics: string[] = [
  "Should college education be free?",
  "Should AI replace teachers?",
  "Should social media have age restrictions?",
  "Is working from home better than working in an office?",
  "Should schools ban smartphones?",
  "Are electric cars better for the environment?",
  "Should students have less homework?",
  "Is artificial intelligence helping or hurting society?",
  "Should public transportation be free?",
  "Should universities require attendance?"
];

// Select a random speaking topic.
export function getRandomTopic(): string {
  const randomIndex = Math.floor(Math.random() * topics.length);

  return topics[randomIndex]!;
}
