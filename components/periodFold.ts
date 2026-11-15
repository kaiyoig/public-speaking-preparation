/**
 * The fold the app's yellow sheets make: closing down to a rule level with a period, then running
 * along it into the period itself. Home's intro folds the whole screen this way once; the
 * loading view folds a highlight over its line this way over and over.
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
  const box = glyph.getBoundingClientRect();
  // The font's ascent and descent sit centered in the box: an inline box is exactly as tall as
  // they are, and an inline-block as tall as its line, with the leading split above and below.
  const leading = box.height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent;
  const baseline = box.top + leading / 2 + metrics.fontBoundingBoxAscent - origin.top;
  const left = box.left - origin.left;
  return {
    top: baseline - metrics.actualBoundingBoxAscent,
    right: left + metrics.actualBoundingBoxRight,
    bottom: baseline + metrics.actualBoundingBoxDescent,
    left: left - metrics.actualBoundingBoxLeft,
  };
}

/** The sheet's outline, as a clip-path, while it covers all of itself. */
export function sheetClip(): string {
  return "inset(0px 0px 0px 0px round 0px)";
}

/**
 * The sheet closed to a rule as tall as the period and level with it, from its left edge across
 * its full width, or only as far as the period when given the sheet's `width`.
 */
export function ruleClip(dot: Box, height: number, width?: number): string {
  const right = width === undefined ? 0 : width - dot.right;
  return `inset(${dot.top}px ${right}px ${height - dot.bottom}px 0px round 0px)`;
}

/** The sheet closed to exactly the period, rounded to a dot. */
export function periodClip(dot: Box, width: number, height: number): string {
  const radius = (dot.right - dot.left) / 2;
  return `inset(${dot.top}px ${width - dot.right}px ${height - dot.bottom}px ${dot.left}px round ${radius}px)`;
}
