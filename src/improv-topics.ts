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
  "Should universities require attendance?",
  "If you punch yourself and it hurts does that make you strong or weak?",
  "Is a hotdog a sandwich?",
  "Is cereal soup?",
  "Are boneless wings the same as chicken nuggets?",
  "Who would win 100 men vs. 1 gorilla?",
  "The dress from 2015: Is it blue and black or white and gold?",
  "Should UCSD dorms have AC?",
  "Cats or dogs?"
];

// Select a random speaking topic.
export function getRandomTopic(): string {
  const randomIndex = Math.floor(Math.random() * topics.length);

  return topics[randomIndex] ?? "Should AI replace teachers?";
}
