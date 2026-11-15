"use client";

import { useEffect, useRef } from "react";
import { FOLD_MS, RULE_AT, TRAVEL, inkBox, periodClip, ruleClip, sheetClip, type Box } from "@/components/periodFold";

/** A dot standing alone in its corner between spins. */
const HOLD_DOT_MS = 450;

/** The rule unrolling out of a dot along the line. */
const UNROLL_MS = 600;

/** The rule opening up into a sheet over the whole line. */
const OPEN_MS = 350;

/** The line held fully highlighted, before and after its spin, long enough to read. */
const HOLD_SHEET_MS = 300;

/** The highlight spinning once all the way around its center. */
const SPIN_MS = 1400;

/** One pass, from a dot in one corner to a dot in the other. */
const PASS_MS = HOLD_DOT_MS + UNROLL_MS + OPEN_MS + HOLD_SHEET_MS + SPIN_MS + HOLD_SHEET_MS + FOLD_MS;

/** The loop: a pass from the period to its twin, and another back. */
const LOOP_MS = 2 * PASS_MS;

/** The sheet's outline at a moment, how many turns it has made, and the ease on to the next. */
interface Stage {
  clip: string;
  turns: number;
  ms: number;
  easing?: string;
}

/**
 * The period's twin in the opposite corner. The highlight hangs out to the left of the line by
 * the period's own width, and the twin sits in that margin exactly as the period sits in its
 * place at the end, turned half around: as far below the top as the period is above the bottom.
 * `periodLeft` and `hang` are where the period's box starts and how wide it is.
 */
function cornerDot(dot: Box, periodLeft: number, hang: number, height: number): Box {
  return {
    top: height - dot.bottom,
    right: hang - (dot.left - periodLeft),
    bottom: height - dot.top,
    left: hang - (dot.right - periodLeft),
  };
}

/**
 * One loop, which starts and ends on the period so it repeats without a seam. The period
 * unrolls back along the baseline as a rule and opens into a sheet that highlights the line;
 * the sheet spins a full turn about its center, then folds up along the top into the twin, as
 * Home's intro folds into the period. The twin unrolls along the top, opens, spins again and
 * folds back down into the period. Two full turns leave the sheet as it started.
 */
function loopStages(period: Box, twin: Box, width: number, height: number): Stage[] {
  const sheet = sheetClip();
  // The rule along the baseline stops at the period; the one along the top runs the full width.
  const rule = (dot: Box) => ruleClip(dot, height, dot === period ? width : undefined);
  const pass = (from: Box, to: Box, turns: number): Stage[] => [
    { clip: periodClip(from, width, height), turns, ms: HOLD_DOT_MS },
    { clip: periodClip(from, width, height), turns, ms: UNROLL_MS, easing: TRAVEL },
    { clip: rule(from), turns, ms: OPEN_MS, easing: TRAVEL },
    { clip: sheet, turns, ms: HOLD_SHEET_MS },
    { clip: sheet, turns, ms: SPIN_MS, easing: TRAVEL },
    { clip: sheet, turns: turns + 1, ms: HOLD_SHEET_MS },
    { clip: sheet, turns: turns + 1, ms: FOLD_MS * RULE_AT, easing: TRAVEL },
    { clip: rule(to), turns: turns + 1, ms: FOLD_MS * (1 - RULE_AT), easing: TRAVEL },
  ];
  return [
    ...pass(period, twin, 0),
    ...pass(twin, period, 1),
    { clip: periodClip(period, width, height), turns: 2, ms: 0 },
  ];
}

/**
 * The sheet's keyframes and its copy's: the copy turns back against the sheet, keyframe for
 * keyframe, so on screen the words never move.
 */
function loopKeyframes(stages: Stage[]): { sheet: Keyframe[]; copy: Keyframe[] } {
  const sheet: Keyframe[] = [];
  const copy: Keyframe[] = [];
  let elapsed = 0;
  for (const { clip, turns, ms, easing } of stages) {
    const timing = { offset: elapsed / LOOP_MS, ...(easing ? { easing } : {}) };
    sheet.push({ ...timing, clipPath: clip, transform: `rotate(${turns}turn)` });
    copy.push({ ...timing, transform: `rotate(${-turns}turn)` });
    elapsed += ms;
  }
  // Exactly the end, whatever the sum came to, so no gap opens before the loop starts over.
  for (const frames of [sheet, copy]) {
    const last = frames.at(-1);
    if (last) last.offset = 1;
  }
  return { sheet, copy };
}

/**
 * What shows while something loads: the label as a line closed by a highlight-yellow period, as
 * in the wordmark. The period folds out into a highlight over the line that spins once about
 * its center and folds into a dot hanging in the top-left margin; the next spin brings it back.
 * A trailing ellipsis on the label gives way to that period. With reduced motion nothing
 * travels: the period only pulses.
 *
 * The highlight is a yellow sheet laid over the line, clipped to the sheet's outline, holding a
 * copy of the line in highlight colors. As the sheet spins, the copy turns back against it, so
 * the words stand still and only the yellow moves across them. The copy's own period is
 * transparent, so folded down the sheet is a plain yellow dot, and while it plays the real
 * period gives way to it.
 */
export function LoadingView({ label }: { label: string }) {
  const text = label.replace(/(?:…|\.)+$/u, "");
  const lineRef = useRef<HTMLParagraphElement>(null);
  const sheetRef = useRef<HTMLSpanElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const periodRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    const sheet = sheetRef.current;
    const copy = copyRef.current;
    const period = periodRef.current;
    if (!line || !sheet || !copy || !period || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animation: Animation | undefined;
    let counter: Animation | undefined;
    let canceled = false;

    // Measured afresh whenever the line rewraps or its face swaps in. The loop keeps its place.
    // The sheet itself may be mid-spin, so its box is worked out from the line's.
    const fit = () => {
      const lineBox = line.getBoundingClientRect();
      const periodBox = period.getBoundingClientRect();
      const hang = periodBox.width;
      const origin = { top: lineBox.top, left: lineBox.left - hang };
      const width = lineBox.width + hang;
      const height = lineBox.height;
      const dot = inkBox(period, origin);
      if (!dot || lineBox.width === 0) return;
      sheet.style.left = `${-hang}px`;
      copy.style.paddingLeft = `${hang}px`;
      const twin = cornerDot(dot, periodBox.left - origin.left, hang, height);
      const keyframes = loopKeyframes(loopStages(dot, twin, width, height));
      if (animation?.effect instanceof KeyframeEffect && counter?.effect instanceof KeyframeEffect) {
        animation.effect.setKeyframes(keyframes.sheet);
        counter.effect.setKeyframes(keyframes.copy);
        return;
      }
      // Started together, the two share a start time and keep in step.
      animation = sheet.animate(keyframes.sheet, { duration: LOOP_MS, iterations: Infinity });
      counter = copy.animate(keyframes.copy, { duration: LOOP_MS, iterations: Infinity });
      line.dataset.looping = "";
    };
    const observer = new ResizeObserver(fit);
    void document.fonts.ready.then(() => {
      if (!canceled) observer.observe(line);
    });

    return () => {
      canceled = true;
      observer.disconnect();
      animation?.cancel();
      counter?.cancel();
      delete line.dataset.looping;
      sheet.style.left = "";
      copy.style.paddingLeft = "";
    };
  }, [text]);

  return (
    <div role="status" className="pt-3">
      <p
        ref={lineRef}
        data-loading-line
        className="group relative w-fit max-w-full font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl"
      >
        {text}
        <span
          ref={periodRef}
          className="text-highlight group-data-[looping]:text-transparent motion-reduce:animate-pulse"
        >
          .
        </span>
        <span
          ref={sheetRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-highlight text-on-highlight [clip-path:inset(50%)]"
        >
          <span ref={copyRef} className="block size-full">
            {text}
            <span className="text-transparent">.</span>
          </span>
        </span>
      </p>
    </div>
  );
}
