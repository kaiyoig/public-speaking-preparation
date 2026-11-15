"use client";

import { useEffect, useRef } from "react";
import Typed from "typed.js";
import { usePanelShowing } from "@/components/HomePager";
import { Wordmark } from "@/components/Wordmark";

const NAME = "Rhetor.";

/** What gets typed: the name with its period in highlight yellow, as in the Wordmark. */
const NAME_HTML = `Rhetor<span class="text-highlight">.</span>`;

/** The slide onto the Title panel is most of the way in before the first letter lands. */
const START_DELAY_MS = 350;

/**
 * The name on the Title panel. It is typed out once each time the panel comes on
 * screen: on arrival, and again after sliding back up from a panel below.
 * It is simply there for reduced motion. Unlike the speeches behind it, it types
 * without a cursor, so nothing stands in front of the name as it arrives.
 *
 * The letters are typed into a box already the width of the whole name, so the
 * ones on screen don't shuffle sideways as the rest arrive.
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

    el.textContent = "";
    const typed = new Typed(el, {
      strings: [NAME_HTML],
      typeSpeed: 110,
      startDelay: START_DELAY_MS,
      showCursor: false,
      autoInsertCss: false,
      contentType: "html",
    });

    return () => {
      typed.stop();
      typed.destroy();
      // Leave the whole name in place while the panel slides away.
      el.innerHTML = NAME_HTML;
    };
  }, [showing]);

  return (
    <>
      <span className="sr-only">{NAME}</span>
      <span aria-hidden="true" className="relative inline-block">
        <span className="invisible">
          <Wordmark />
        </span>
        <span className="absolute inset-0 text-left whitespace-nowrap">
          <span ref={ref} />
        </span>
      </span>
    </>
  );
}
