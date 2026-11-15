"use client";

import { useEffect, useRef, useState } from "react";
import Typed from "typed.js";
import { FAMOUS_SPEECHES, type FamousSpeech } from "@/components/famousSpeeches";
import { usePanelShowing } from "@/components/HomePager";
import { afterIntro } from "@/components/intro";

/** Brisk, well ahead of speech, so a few lines are down within seconds of arriving. */
const MS_PER_CHARACTER = 22;

/** The breath between one paragraph and the next. */
const PARAGRAPH_PAUSE_MS = 500;

/** How long a finished speech stays before it fades and the next one starts. */
const HOLD_MS = 4000;

const FADE_MS = 500;

/** For reduced motion, how much of a speech is shown. */
const PARAGRAPHS_SHOWN_STILL = 4;

/**
 * A whole speech can run to a hundred paragraphs. One is dropped once its last
 * line is this far above the bottom of the screen, where it can't be seen.
 */
const DROPPED_ABOVE_SCREENS = 1.5;

const PARAGRAPH_CLASS = "mt-[0.6em] first:mt-0";

const shuffled = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
};

/** The paragraphs of a speech, fetching its transcript if it has one. Empty if the transcript can't be had. */
const paragraphsOf = async (speech: FamousSpeech, signal: AbortSignal): Promise<string[]> => {
  if (Array.isArray(speech.words)) return speech.words;
  try {
    const response = await fetch(speech.words.transcript, { signal });
    if (!response.ok) return [];
    const text = await response.text();
    return text.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
};

/**
 * The background of the Title panel: famous speeches typed out one after another,
 * paragraph by paragraph, in a different order each visit, with a line saying whose
 * words they are. Typing pauses while another panel is on screen, and starts only
 * once Home's intro is over.
 *
 * For reduced motion the opening of a single speech is shown, still. It is
 * decoration, so it is hidden from screen readers.
 */
export function SpeechBackdrop() {
  const showing = usePanelShowing();
  const columnRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<Typed | null>(null);
  const showingRef = useRef(showing);
  const [speech, setSpeech] = useState<FamousSpeech | null>(null);

  useEffect(() => {
    const column = columnRef.current;
    const page = pageRef.current;
    if (!column || !page) return;
    const speeches = shuffled(FAMOUS_SPEECHES);
    const abort = new AbortController();
    let timer: number | undefined;

    // How far the page is pushed up so that its last line sits at the foot of the column.
    let raised = 0;
    /** Moves the page to `raised`: gliding there as a new line pushes it up, or at once when asked not to. */
    const place = (glide: boolean) => {
      page.style.transition = glide ? "" : "none";
      page.style.transform = `translateY(${-raised}px)`;
      if (!glide) {
        // Commit the jump before the transition comes back, so it isn't animated after all.
        void page.offsetHeight;
        page.style.transition = "";
      }
    };
    const follow = () => {
      const needed = Math.max(0, page.offsetHeight - column.clientHeight);
      if (needed === raised) return;
      raised = needed;
      place(true);
    };
    const resizes = new ResizeObserver(follow);
    resizes.observe(page);
    resizes.observe(column);

    const clearPage = () => {
      page.replaceChildren();
      raised = 0;
      place(false);
    };

    /** Drops paragraphs that have gone well off the top, holding the rest exactly where they are. */
    const dropUnseen = () => {
      let dropped = 0;
      for (;;) {
        const first = page.firstElementChild;
        const second = first?.nextElementSibling;
        if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) break;
        // The first paragraph's height, with the gap under it that goes when it does.
        const height = second.offsetTop - first.offsetTop;
        if (height > raised - dropped - column.clientHeight * (DROPPED_ABOVE_SCREENS - 1)) break;
        first.remove();
        dropped += height;
      }
      if (dropped === 0) return;
      raised -= dropped;
      place(false);
    };

    const addParagraph = () => {
      dropUnseen();
      const paragraph = document.createElement("p");
      paragraph.className = PARAGRAPH_CLASS;
      const text = paragraph.appendChild(document.createElement("span"));
      page.append(paragraph);
      return text;
    };

    /** Runs `then` after a pause, unless the backdrop has gone by then. */
    const after = (ms: number, then: () => void) => {
      timer = window.setTimeout(then, ms);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const only = speeches[0];
      if (only) {
        void paragraphsOf(only, abort.signal).then((paragraphs) => {
          if (abort.signal.aborted) return;
          for (const paragraph of paragraphs.slice(0, PARAGRAPHS_SHOWN_STILL)) addParagraph().textContent = paragraph;
          setSpeech(only);
        });
      }
      return () => {
        abort.abort();
        resizes.disconnect();
        clearPage();
      };
    }

    const stopTyping = () => {
      // Stopped first, so nothing the instance still has queued can type after the destroy.
      typedRef.current?.stop();
      typedRef.current?.destroy();
      typedRef.current = null;
    };

    const deliver = async (position: number) => {
      const next = speeches[position % speeches.length];
      if (!next) return;
      const paragraphs = await paragraphsOf(next, abort.signal);
      if (abort.signal.aborted) return;
      if (paragraphs.length === 0) {
        // Nothing to type: move on, but not in a tight loop if every transcript is out of reach.
        after(HOLD_MS, () => void deliver(position + 1));
        return;
      }

      clearPage();
      column.classList.remove("opacity-0");
      setSpeech(next);

      const typeParagraph = (index: number) => {
        const words = paragraphs[index];
        if (words === undefined) {
          after(HOLD_MS, () => {
            column.classList.add("opacity-0");
            after(FADE_MS, () => void deliver(position + 1));
          });
          return;
        }
        const text = addParagraph();
        text.classList.add("type-cursor");
        const typed = new Typed(text, {
          strings: [words],
          typeSpeed: MS_PER_CHARACTER,
          showCursor: false,
          autoInsertCss: false,
          contentType: "null",
          onComplete: () => {
            // The instance is done; drop it without the destroy that would wipe what it typed.
            typedRef.current = null;
            const last = index === paragraphs.length - 1;
            after(last ? 0 : PARAGRAPH_PAUSE_MS, () => {
              if (!last) text.classList.remove("type-cursor");
              typeParagraph(index + 1);
            });
          },
        });
        typedRef.current = typed;
        if (!showingRef.current) typed.stop();
      };
      typeParagraph(0);
    };
    // The room stays quiet through Home's intro, until the name is complete.
    const cancelStart = afterIntro(() => void deliver(0));

    return () => {
      cancelStart();
      abort.abort();
      window.clearTimeout(timer);
      stopTyping();
      resizes.disconnect();
      clearPage();
      column.classList.remove("opacity-0");
    };
  }, []);

  useEffect(() => {
    showingRef.current = showing;
    if (showing) typedRef.current?.start();
    else typedRef.current?.stop();
  }, [showing]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-clip select-none text-left">
      {/*
       * The page hangs from the top of the column. Once a speech is taller than the
       * column, the page is raised a line at a time so the line being typed stays at
       * the foot, and the first lines leave over the top of the screen.
       */}
      <div
        ref={columnRef}
        className="absolute inset-x-6 top-6 bottom-16 transition-opacity duration-500 sm:inset-x-12 sm:top-10 lg:inset-x-24"
      >
        <div
          ref={pageRef}
          className="text-[clamp(1.5rem,3.4vw,3.25rem)] font-medium leading-[1.18] tracking-[-0.02em] text-mute/30 transition-transform duration-500 ease-out"
        />
      </div>
      {speech && (
        // It stops short of the "Choose a mode" link in the opposite corner.
        <p className="absolute right-20 bottom-5 left-6 w-fit bg-paper pr-3 text-base font-medium text-mute sm:left-12 md:right-[22rem] lg:left-24 lg:right-[26rem]">
          {speech.orator}, {speech.occasion}
        </p>
      )}
    </div>
  );
}
