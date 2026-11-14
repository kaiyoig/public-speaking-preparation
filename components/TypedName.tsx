"use client";

import { useEffect, useRef } from "react";
import Typed from "typed.js";
import { usePanelShowing } from "@/components/HomePager";

const NAME = "Rhetor.";

/** The slide onto the Title panel is most of the way in before the first letter lands. */
const START_DELAY_MS = 350;

/** How long the cursor stays after the last letter. */
const CURSOR_LINGER_MS = 1200;

/**
 * The name on the Title panel. It is typed out once each time the panel comes on
 * screen: on arrival, and again after sliding back up from a panel below.
 * It is simply there for reduced motion.
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
      el.textContent = NAME;
      return;
    }

    let lingering: number | undefined;
    el.textContent = "";
    el.classList.add("type-cursor");
    const typed = new Typed(el, {
      strings: [NAME],
      typeSpeed: 110,
      startDelay: START_DELAY_MS,
      showCursor: false,
      autoInsertCss: false,
      contentType: "null",
      onComplete: () => {
        lingering = window.setTimeout(() => el.classList.remove("type-cursor"), CURSOR_LINGER_MS);
      },
    });

    return () => {
      window.clearTimeout(lingering);
      typed.stop();
      typed.destroy();
      // Leave the whole name in place while the panel slides away.
      el.classList.remove("type-cursor");
      el.textContent = NAME;
    };
  }, [showing]);

  return (
    <>
      <span className="sr-only">{NAME}</span>
      <span aria-hidden="true" className="relative inline-block">
        <span className="invisible">{NAME}</span>
        <span className="absolute inset-0 text-left whitespace-nowrap">
          <span ref={ref} />
        </span>
      </span>
    </>
  );
}
