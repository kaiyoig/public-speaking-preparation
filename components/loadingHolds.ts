/**
 * Whether the loading screen is wanted, and for what. Anything that loads puts a hold on it while
 * it waits, labeled with what it waits for, and releases the hold when it is done. The screen
 * stays up while any hold remains and shows the label of the newest one.
 *
 * The holds live here rather than in React, so the screen can outlast what asked for it: a
 * route's loading fallback is unmounted the moment its page is ready, and the screen still
 * plays its way out over that page.
 */

interface Hold {
  label: string;
  /** Wants the screen up at once, however quick the load, rather than after the usual delay. */
  immediate: boolean;
}

const holds: Hold[] = [];
const listeners = new Set<() => void>();

/** Bumped on every change, so a React snapshot of the holds changes with them. */
let version = 0;

function changed() {
  version += 1;
  for (const listener of [...listeners]) listener();
}

/**
 * Puts a hold on the loading screen, labeled with what is loading. Returns its release. An
 * `immediate` hold puts the screen up at once, for something that waits on the screen itself.
 */
export function holdLoadingScreen(label: string, { immediate = false } = {}): () => void {
  const hold = { label, immediate };
  holds.push(hold);
  changed();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds.splice(holds.indexOf(hold), 1);
    changed();
  };
}

/** What the newest hold is loading, or undefined when nothing holds the screen. */
export function loadingLabel(): string | undefined {
  return holds.at(-1)?.label;
}

/** Whether any hold wants the screen up at once. */
export function loadingImmediate(): boolean {
  return holds.some((hold) => hold.immediate);
}

/** Changes whenever a hold is put on or released. */
export function loadingVersion(): number {
  return version;
}

/** Calls `listener` on every change, until the returned function is called. */
export function onLoadingChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the screen has come all the way up and covers the page. */
let covered = false;
const coverWaiters = new Set<() => void>();

/** Called by the screen as it finishes covering the page, and as it starts to uncover it. */
export function setScreenCovered(next: boolean): void {
  covered = next;
  if (!covered) return;
  for (const resolve of [...coverWaiters]) resolve();
  coverWaiters.clear();
}

/** Resolves once the screen covers the page, at once if it already does. */
export function whenScreenCovered(): Promise<void> {
  if (covered) return Promise.resolve();
  return new Promise((resolve) => coverWaiters.add(resolve));
}

let navigationRelease: (() => void) | undefined;

/**
 * Holds the loading screen from a link's click until the page it opens has rendered, and resolves
 * once the screen covers the page being left. The link navigates only then, so that page stays up
 * underneath and the screen plays however quickly the next one loads.
 */
export function holdUntilNavigated(label: string): Promise<void> {
  navigationRelease?.();
  navigationRelease = holdLoadingScreen(label, { immediate: true });
  return whenScreenCovered();
}

/** Releases the hold `holdUntilNavigated` put on, if any. Called once each new route renders. */
export function releaseNavigationHold(): void {
  navigationRelease?.();
  navigationRelease = undefined;
}
