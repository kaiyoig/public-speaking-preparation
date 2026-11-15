"use client";

import { useEffect, useRef } from "react";
import { endIntro, introFolded, introStage, onIntroChange } from "@/components/intro";

/** A beat of pure yellow once the page is live, so the fold reads as a choice rather than a glitch. */
const HOLD_MS = 150;

/** The fold down to a rule, then along it into the period. */
const FOLD_MS = 1150;

/** The share of the fold spent closing to a rule, before it runs along into the period. */
const RULE_AT = 0.45;

/** The app's travel ease: what moves across the screen. */
const TRAVEL = "cubic-bezier(0.7, 0, 0.2, 1)";

/** Measuring the period needs the display face; past this the fold goes ahead with what's there. */
const FONT_WAIT_MS = 1500;

/** Any of these skips straight to the finished panel. */
const SKIP_INPUTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;

interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Where a glyph's ink sits on screen. Its element box is the whole em, with side bearings and
 * room for ascenders, so the ink is found from the font's own metrics, measured from the baseline.
 */
function inkBox(glyph: HTMLElement): Box | undefined {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return undefined;
  const style = getComputedStyle(glyph);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = context.measureText(glyph.textContent ?? "");
  const box = glyph.getBoundingClientRect();
  const baseline = box.bottom - metrics.fontBoundingBoxDescent;
  return {
    top: baseline - metrics.actualBoundingBoxAscent,
    right: box.left + metrics.actualBoundingBoxRight,
    bottom: baseline + metrics.actualBoundingBoxDescent,
    left: box.left - metrics.actualBoundingBoxLeft,
  };
}

/** The sheet's outline at each stage: the whole screen, a rule level with the period, then the period. */
function foldKeyframes(dot: Box): Keyframe[] {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const radius = (dot.right - dot.left) / 2;
  return [
    { clipPath: "inset(0px 0px 0px 0px round 0px)", easing: TRAVEL },
    { clipPath: `inset(${dot.top}px 0px ${height - dot.bottom}px 0px round 0px)`, offset: RULE_AT, easing: TRAVEL },
    { clipPath: `inset(${dot.top}px ${width - dot.right}px ${height - dot.bottom}px ${dot.left}px round ${radius}px)` },
  ];
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The yellow sheet that opens Home on a full load. The CSS shows it from the first frame
 * while the intro is at its `fold` stage; this folds it down until it is exactly the period of
 * the name, then hands over to the real period beneath. Only the Title panel renders it.
 */
export function HomeIntro() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sheet = ref.current;
    if (!sheet || introStage() !== "fold") return;

    let animation: Animation | undefined;
    let cancelled = false;

    const skip = () => endIntro();
    for (const type of SKIP_INPUTS) window.addEventListener(type, skip, { passive: true });
    const stopSkipping = () => {
      for (const type of SKIP_INPUTS) window.removeEventListener(type, skip);
    };
    const offIntro = onIntroChange(() => {
      if (introStage()) return;
      stopSkipping();
      animation?.cancel();
    });

    void (async () => {
      await Promise.race([document.fonts.ready, wait(FONT_WAIT_MS)]);
      await wait(HOLD_MS);
      if (cancelled || introStage() !== "fold") return;
      const period = document.querySelector<HTMLElement>("[data-intro-period]");
      const dot = period && inkBox(period);
      if (!dot) {
        endIntro();
        return;
      }
      animation = sheet.animate(foldKeyframes(dot), { duration: FOLD_MS, fill: "forwards" });
      try {
        await animation.finished;
      } catch {
        // Canceled: skipped, or Home went away.
        return;
      }
      introFolded();
    })();

    // Leaves the intro playing: a Strict Mode remount picks it up again, and leaving Home
    // takes input, which has already skipped it.
    return () => {
      cancelled = true;
      animation?.cancel();
      stopSkipping();
      offIntro();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="intro-sheet" />;
}
