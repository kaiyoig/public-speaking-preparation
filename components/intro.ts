/**
 * Home's intro, played whenever Home is loaded or reloaded in full: a sheet of highlight yellow folds
 * down into the period of the name, the letters type up to it, and only then does the rest
 * of the Title panel come in.
 *
 * Whether it plays is decided before first paint by INTRO_SCRIPT, which records the stage on
 * `<html data-intro>`. The CSS reads that attribute, so the sheet covers the page from the very
 * first frame and what comes in afterward is hidden until then, with no flash before hydration.
 *
 * - `fold`: the sheet is folding down into the period.
 * - `name`: the period stands alone and the letters are typing up to it.
 * - no attribute: the intro is over, or never played.
 */
export type IntroStage = "fold" | "name";

/**
 * Runs in the document head, so only on a full load: a client navigation back to Home doesn't
 * replay the intro. Plays it only on the Title panel, and never for reduced motion. Anything
 * that goes wrong just skips it.
 */
export const INTRO_SCRIPT = `try{if(location.pathname==="/"&&location.hash!=="#modes"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="fold"}}catch(e){}`;

const listeners = new Set<() => void>();

/** The stage the intro is at, or undefined when it isn't playing. */
export function introStage(): IntroStage | undefined {
  if (typeof document === "undefined") return undefined;
  const stage = document.documentElement.dataset.intro;
  return stage === "fold" || stage === "name" ? stage : undefined;
}

function setStage(stage: IntroStage | undefined) {
  if (introStage() === stage) return;
  if (stage) document.documentElement.dataset.intro = stage;
  else delete document.documentElement.dataset.intro;
  for (const listener of [...listeners]) listener();
}

/** The sheet has folded into the period: the letters can start. */
export function introFolded() {
  if (introStage() === "fold") setStage("name");
}

/** The name is complete, or the Speaker has skipped ahead: everything comes in. */
export function endIntro() {
  setStage(undefined);
}

/** Calls `listener` on every change of stage, until the returned function is called. */
export function onIntroChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Runs `then` once the intro is over, or straight away if it isn't playing. Returns a cancel. */
export function afterIntro(then: () => void): () => void {
  if (!introStage()) {
    then();
    return () => {};
  }
  const off = onIntroChange(() => {
    if (introStage()) return;
    off();
    then();
  });
  return off;
}
