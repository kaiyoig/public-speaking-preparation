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
}

const holds: Hold[] = [];
const listeners = new Set<() => void>();

/** Bumped on every change, so a React snapshot of the holds changes with them. */
let version = 0;

function changed() {
  version += 1;
  for (const listener of [...listeners]) listener();
}

/** Puts a hold on the loading screen, labeled with what is loading. Returns its release. */
export function holdLoadingScreen(label: string): () => void {
  const hold = { label };
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
