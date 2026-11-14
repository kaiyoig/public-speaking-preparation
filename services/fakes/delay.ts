export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** An artificial 500–1500 ms delay, so that loading states are actually seen. */
export function fakeLatency(): Promise<void> {
  return wait(500 + Math.random() * 1000);
}

export function pickRandom<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error("pickRandom called with an empty list");
  return item;
}
