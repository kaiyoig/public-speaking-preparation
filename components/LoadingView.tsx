"use client";

import { useEffect, useRef } from "react";
import { FOLD_MS, RULE_AT, TRAVEL, inkBox, periodClip, ruleClip, sheetClip, type Box } from "@/components/periodFold";

/** A dot standing alone at either end of a pass. */
const HOLD_DOT_MS = 450;

/** The rule unrolling back from the period to the start of the line. */
const RUN_BACK_MS = 600;

/** The rule opening up into a sheet over the whole line. */
const OPEN_MS = 350;

/** The line held fully highlighted, long enough to read. */
const HOLD_SHEET_MS = 450;

/** One pass, from one corner to the other. The loop is a pass there and the same pass back. */
const PASS_MS = HOLD_DOT_MS + RUN_BACK_MS + OPEN_MS + HOLD_SHEET_MS + FOLD_MS + HOLD_DOT_MS;

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

function passKeyframes(dot: Box, corner: Box, width: number, height: number): Keyframe[] {
  let elapsed = 0;
  const after = (ms: number) => (elapsed += ms) / PASS_MS;
  const period = periodClip(dot, width, height);
  const baseRule = ruleClip(dot, height, width);
  const sheet = sheetClip();
  const topRule = ruleClip(corner, height);
  const twin = periodClip(corner, width, height);
  return [
    { clipPath: period, offset: 0 },
    { clipPath: period, offset: after(HOLD_DOT_MS), easing: TRAVEL },
    { clipPath: baseRule, offset: after(RUN_BACK_MS), easing: TRAVEL },
    { clipPath: sheet, offset: after(OPEN_MS) },
    { clipPath: sheet, offset: after(HOLD_SHEET_MS), easing: TRAVEL },
    { clipPath: topRule, offset: after(FOLD_MS * RULE_AT), easing: TRAVEL },
    { clipPath: twin, offset: after(FOLD_MS * (1 - RULE_AT)) },
    { clipPath: twin, offset: 1 },
  ];
}

/**
 * What shows while something loads: the label as a line closed by a highlight-yellow period, as
 * in the wordmark, with the period folding out into a highlight over the line, down into a dot
 * in the top left, and back the same way.
 * A trailing ellipsis on the label gives way to that period. With reduced motion nothing
 * travels: the period only pulses.
 *
 * The highlight is a copy of the line in highlight colors laid over it, clipped to the
 * sheet's outline. Its own period is transparent, so folded down it is a plain yellow dot, and
 * while it plays the real period gives way to it.
 */
export function LoadingView({ label }: { label: string }) {
  const text = label.replace(/(?:…|\.)+$/u, "");
  const lineRef = useRef<HTMLParagraphElement>(null);
  const sheetRef = useRef<HTMLSpanElement>(null);
  const periodRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    const sheet = sheetRef.current;
    const period = periodRef.current;
    if (!line || !sheet || !period || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animation: Animation | undefined;
    let canceled = false;

    // Measured afresh whenever the line rewraps or its face swaps in. The loop keeps its place.
    const fit = () => {
      const hang = period.getBoundingClientRect().width;
      sheet.style.left = `${-hang}px`;
      sheet.style.paddingLeft = `${hang}px`;
      const box = sheet.getBoundingClientRect();
      const dot = inkBox(period, box);
      if (!dot || box.width === 0) return;
      const periodLeft = period.getBoundingClientRect().left - box.left;
      const corner = cornerDot(dot, periodLeft, hang, box.height);
      const keyframes = passKeyframes(dot, corner, box.width, box.height);
      if (animation?.effect instanceof KeyframeEffect) {
        animation.effect.setKeyframes(keyframes);
        return;
      }
      animation = sheet.animate(keyframes, { duration: PASS_MS, iterations: Infinity, direction: "alternate" });
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
      delete line.dataset.looping;
      sheet.style.left = "";
      sheet.style.paddingLeft = "";
    };
  }, [text]);

  return (
    <div role="status" className="pt-3">
      <p
        ref={lineRef}
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
          className="absolute inset-0 bg-highlight text-on-highlight [clip-path:inset(50%)]"
        >
          {text}
          <span className="text-transparent">.</span>
        </span>
      </p>
    </div>
  );
}
