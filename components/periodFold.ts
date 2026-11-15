/**
 * The fold the app's yellow sheets make: closing down to a rule level with a period, then running
 * along it into the period itself. Home's intro folds the whole screen this way.
 */

/** The app's travel ease: what moves across the screen. */
export const TRAVEL = "cubic-bezier(0.7, 0, 0.2, 1)";

/** The fold down to a rule, then along it into the period. */
export const FOLD_MS = 1150;

/** The share of a fold spent closing to a rule, before it runs along into the period. */
export const RULE_AT = 0.45;

export interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Where a glyph's ink sits, relative to `origin` (the viewport by default). Its element box is the
 * whole em, with side bearings and room for ascenders, so the ink is found from the font's own
 * metrics, measured from the baseline.
 */
export function inkBox(glyph: HTMLElement, origin: { top: number; left: number } = { top: 0, left: 0 }): Box | undefined {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return undefined;
  const style = getComputedStyle(glyph);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = context.measureText(glyph.textContent ?? "");
  const left = glyph.getBoundingClientRect().left - origin.left;
  const baseline = baselineOf(glyph) - origin.top;
  return {
    top: baseline - metrics.actualBoundingBoxAscent,
    right: left + metrics.actualBoundingBoxRight,
    bottom: baseline + metrics.actualBoundingBoxDescent,
    left: left - metrics.actualBoundingBoxLeft,
  };
}

/**
 * Where the text in `element` is drawn, in the viewport. An empty inline-block rests its bottom on
 * the baseline, in an inline box or an inline-block alike, so one is put in and read. Working it
 * out from the box and the font's ascent instead goes wrong by half a pixel wherever the browser
 * rounds the box's height differently from the font's metrics. Browsers draw text on the nearest
 * device pixel to its baseline, so the baseline is snapped there too.
 */
function baselineOf(element: HTMLElement): number {
  const probe = document.createElement("span");
  probe.style.cssText = "display: inline-block; width: 0; height: 0;";
  element.append(probe);
  const laidOut = probe.getBoundingClientRect().bottom;
  probe.remove();
  const scale = window.devicePixelRatio;
  return Math.round(laidOut * scale) / scale;
}

/** The sheet's outline, as a clip-path, while it covers all of itself. */
export function sheetClip(): string {
  return "inset(0px 0px 0px 0px round 0px)";
}

/** The sheet closed to a rule as tall as the period and level with it, across its full width. */
export function ruleClip(dot: Box, height: number): string {
  return `inset(${dot.top}px 0px ${height - dot.bottom}px 0px round 0px)`;
}

/** The sheet closed to exactly the period, rounded to a dot. */
export function periodClip(dot: Box, width: number, height: number): string {
  const radius = (dot.right - dot.left) / 2;
  return `inset(${dot.top}px ${width - dot.right}px ${height - dot.bottom}px ${dot.left}px round ${radius}px)`;
}
