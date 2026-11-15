"use client";

import { useEffect, useState } from "react";
import { usePanelShowing } from "@/components/HomePager";

const MS_PER_CHARACTER = 35;

/** The beat between one title finishing and the next starting. */
const PAUSE_BETWEEN_MS = 150;

/** As with the name: the slide onto the panel is most of the way in before the first letter lands. */
const START_DELAY_MS = 350;

/** How long the cursor stays after the last title. */
const CURSOR_LINGER_MS = 1200;

interface TypedTitleProps {
  /** Every title in the run, in the order they are typed. */
  titles: string[];
  /** Which of them this is. It starts once the ones before it are done, so only one types at a time. */
  index: number;
}

/**
 * One of a run of titles typed out in turn each time their panel comes on screen,
 * like the name on the Title panel. It is simply there for reduced motion.
 *
 * The letters still to come take up their space unseen, so the title wraps the
 * same way throughout and nothing below it moves.
 */
export function TypedTitle({ titles, index }: TypedTitleProps) {
  const showing = usePanelShowing();
  const text = titles[index] ?? "";
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!showing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }

    const before = titles.slice(0, index);
    const startMs =
      START_DELAY_MS + before.join("").length * MS_PER_CHARACTER + before.length * PAUSE_BETWEEN_MS;
    const last = index === titles.length - 1;

    let count = 0;
    let timer: number | undefined;
    const step = () => {
      count += 1;
      setShown(count);
      if (count < text.length) {
        timer = window.setTimeout(step, MS_PER_CHARACTER);
      } else if (last) {
        timer = window.setTimeout(() => setTyping(false), CURSOR_LINGER_MS);
      } else {
        setTyping(false);
      }
    };

    setShown(0);
    timer = window.setTimeout(() => {
      setTyping(true);
      step();
    }, startMs);

    return () => {
      window.clearTimeout(timer);
      // Leave the whole title in place while the panel slides away.
      setTyping(false);
      setShown(text.length);
    };
  }, [showing, titles, index, text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        <span className={typing ? "type-cursor" : undefined}>{text.slice(0, shown)}</span>
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </>
  );
}
