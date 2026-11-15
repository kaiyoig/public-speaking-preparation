"use client";

import { useEffect, useRef } from "react";
import { endIntro, introFolded, introStage, onIntroChange } from "@/components/intro";
import { FOLD_MS, RULE_AT, TRAVEL, inkBox, periodClip, ruleClip, sheetClip, type Box } from "@/components/periodFold";

/** A beat of pure yellow once the page is live, so the fold reads as a choice rather than a glitch. */
const HOLD_MS = 150;

/** Measuring the period needs the display face; past this the fold goes ahead with what's there. */
const FONT_WAIT_MS = 1500;

/** Any of these skips straight to the finished panel. */
const SKIP_INPUTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;

/** The sheet's outline at each stage: the whole screen, a rule level with the period, then the period. */
function foldKeyframes(dot: Box): Keyframe[] {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return [
    { clipPath: sheetClip(), easing: TRAVEL },
    { clipPath: ruleClip(dot, height), offset: RULE_AT, easing: TRAVEL },
    { clipPath: periodClip(dot, width, height) },
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
