"use client";

import { useEffect, useRef } from "react";
import Typed from "typed.js";
import { usePanelShowing } from "@/components/HomePager";
import { endIntro, introStage, onIntroChange } from "@/components/intro";

const NAME = "Rhetor.";

/** What gets typed: the name with its period in highlight yellow, as in the Wordmark. */
const NAME_HTML = `Rhetor<span class="text-highlight">.</span>`;

/** The slide onto the Title panel is most of the way in before the first letter lands. */
const START_DELAY_MS = 350;

/** In the intro, the beat with the period standing alone before the first letter. */
const INTRO_START_DELAY_MS = 250;

const TYPE_SPEED = 110;

/**
 * The name on the Title panel. It is typed out once each time the panel comes on
 * screen: on arrival, and again after sliding back up from a panel below.
 * It is simply there for reduced motion. Unlike the speeches behind it, it types
 * without a cursor, so nothing stands in front of the name as it arrives.
 *
 * In Home's intro the period comes first, folded down from the yellow sheet, and the
 * letters type up to it. The intro ends when they reach it.
 *
 * The letters are typed into a box already the width of the whole name, so the
 * ones on screen don't shuffle sideways as the rest arrive. The intro's period is
 * that box's own period, shown while the intro plays.
 */
export function TypedName() {
  const showing = usePanelShowing();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !showing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.innerHTML = NAME_HTML;
      return;
    }

    let typed: Typed | undefined;
    let offIntro = () => {};

    const type = (text: string, startDelay: number, onDone: () => void) => {
      typed = new Typed(el, {
        strings: [text],
        typeSpeed: TYPE_SPEED,
        startDelay,
        showCursor: false,
        autoInsertCss: false,
        contentType: "html",
        onComplete: onDone,
      });
    };

    /** Puts the whole name in place at once. */
    const complete = () => {
      typed?.stop();
      typed?.destroy();
      el.innerHTML = NAME_HTML;
    };

    el.textContent = "";
    if (!introStage()) {
      type(NAME_HTML, START_DELAY_MS, () => {});
    } else {
      // The typed period lands exactly on the standing one.
      let done = false;
      const finish = () => {
        done = true;
        endIntro();
      };
      const follow = () => {
        const stage = introStage();
        if (stage === "name" && !typed) type(NAME_HTML, INTRO_START_DELAY_MS, finish);
        // Skipped ahead: no more typing.
        if (!stage && !done) complete();
      };
      offIntro = onIntroChange(follow);
      follow();
    }

    return () => {
      offIntro();
      // Leave the whole name in place while the panel slides away.
      complete();
    };
  }, [showing]);

  return (
    <>
      <span className="sr-only">{NAME}</span>
      <span aria-hidden="true" className="relative inline-block">
        <span className="invisible">
          Rhetor
          <span data-intro-period className="text-highlight">
            .
          </span>
        </span>
        <span className="absolute inset-0 text-left whitespace-nowrap">
          <span ref={ref} />
        </span>
      </span>
    </>
  );
}
