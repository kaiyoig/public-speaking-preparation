"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { holdLoadingScreen, loadingLabel, loadingVersion, onLoadingChange } from "@/components/loadingHolds";
import { TRAVEL, inkBox, type Box } from "@/components/periodFold";

const LETTERS = ["R", "h", "e", "t", "o", "r"] as const;

/** A load quicker than this never shows the screen at all. */
const SHOW_DELAY_MS = 150;

/** The screen sliding up over the page before anything on it moves. */
const SLIDE_MS = 550;

/** Measuring the letters needs the display face; past this the screen goes ahead with what's there. */
const FONT_WAIT_MS = 1500;

/** Each block appearing as a dot on the baseline and stretching up to its full height. */
const RISE_MS = 480;

/** The share of a block's rise spent appearing as a dot, before it stretches up. */
const DOT_AT = 0.35;

/** Between one block starting to rise and the next. */
const RISE_STAGGER_MS = 70;

/** The blocks morphing into the letters. */
const MORPH_MS = 650;

/** How far each block's morph trails the one before it, as a share of the whole morph. */
const MORPH_STAGGER = 0.05;

/** The most the morph blurs the shapes it melts between, as a share of the font size. */
const MORPH_BLUR = 0.032;

/** The finished name held a beat before it can be swallowed, so a quick load still reads it. */
const READ_MS = 250;

/** The dot stretching back along the line over the letters, eating them as it goes. */
const EAT_MS = 650;

/** The share of the stretch spent swelling to the letters' height, before it runs along them. */
const SWELL_AT = 0.3;

/** The stretched dot compressing back down to a dot, in the middle of where the name was. */
const COMPRESS_MS = 420;

/** The gap between two blocks, as a share of a block's width. */
const BLOCK_GAP = 0.14;

/** How far the stretched dot reaches past the letters on every side, as a share of their height. */
const EAT_MARGIN = 0.1;

/** The dot traveling to the middle of the screen as it grows past every edge. */
const GROW_MS = 650;

/** The share of the dot's growth by which it covers the whole screen. */
const COVERED_AT = 0.85;

/** The hole in the dot opening out past every edge, onto the page. */
const OPEN_MS = 700;

/** How far past the screen's corners the full-grown dot reaches, so its edge is never seen. */
const OVERREACH = 1.2;

/** The fade for reduced motion, in and out, in place of everything that travels. */
const FADE_MS = 200;

/** The id of the filter that melts the blocks into the letters. */
const MELT_FILTER = "loading-screen-melt";

/** A smooth ease in and out of 0 to 1, clamped. */
function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** The ease of a hole opening: quick to start, then settling as it clears the screen. */
const OPEN_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Resolves once nothing holds the screen any more. */
function released(): Promise<void> {
  return new Promise((resolve) => {
    if (loadingLabel() === undefined) return resolve();
    const off = onLoadingChange(() => {
      if (loadingLabel() !== undefined) return;
      off();
      resolve();
    });
  });
}

/** Holds the loading screen while mounted and `active`, labeled with what is loading. */
export function useLoadingScreen(label: string, active = true) {
  useEffect(() => {
    if (!active) return;
    return holdLoadingScreen(label);
  }, [label, active]);
}

/** Holds the loading screen while mounted: for a route's loading fallback, which can't call hooks on the server. */
export function LoadingHold({ label }: { label: string }) {
  useLoadingScreen(label);
  return null;
}

/**
 * One block per letter, all the same size: as tall as the tallest letter stands above the
 * baseline, and spaced evenly, with even gaps, across the letters' ink from first to last.
 */
function blockCells(inks: Box[]): Box[] {
  const left = Math.min(...inks.map((ink) => ink.left));
  const right = Math.max(...inks.map((ink) => ink.right));
  const top = Math.min(...inks.map((ink) => ink.top));
  // The first letter stands flat on the baseline; round ones dip just below it.
  const bottom = inks[0]!.bottom;
  const width = (right - left) / (inks.length + BLOCK_GAP * (inks.length - 1));
  return inks.map((_, index) => {
    const start = left + index * width * (1 + BLOCK_GAP);
    return { top, right: start + width, bottom, left: start };
  });
}

/** The square the period's dot fills: as wide as its ink, centered on it. */
function dotSquare(ink: Box): Box {
  const side = ink.right - ink.left;
  const middle = (ink.top + ink.bottom) / 2;
  return { top: middle - side / 2, right: ink.right, bottom: middle + side / 2, left: ink.left };
}

/** A box as the inline position and size an absolutely positioned element takes. */
function frame(box: Box): Keyframe {
  return {
    top: `${box.top}px`,
    left: `${box.left}px`,
    width: `${box.right - box.left}px`,
    height: `${box.bottom - box.top}px`,
  };
}

function place(element: HTMLElement, box: Box) {
  element.style.top = `${box.top}px`;
  element.style.left = `${box.left}px`;
  element.style.width = `${box.right - box.left}px`;
  element.style.height = `${box.bottom - box.top}px`;
}

/** The center of an element on screen. */
function center(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * The one loading screen, for everything that loads: the name on its own, closed by its
 * highlight-yellow period, with a line beneath saying what it waits for. It slides up over the
 * page, led by a heavy ink rule, before anything on it moves. Rendered once in
 * the root layout; anything that loads holds it with `useLoadingScreen` or `LoadingHold`.
 *
 * In, a dot of ink appears on the baseline for each letter, left to right, and stretches up into
 * a block, all of them the same size; the period comes last, a yellow dot that stays a dot. The
 * blocks then melt into the letters, their corners rounding off and holes opening where the
 * counters will be, and the name stays just as it is until the last hold is released. Out, the dot swells and stretches back along the line, eating the letters right to
 * left, then compresses back down to a dot where the middle of the name was. From there it
 * travels to the middle of the screen, growing past every edge, and a hole opens in it onto the
 * page that has loaded.
 *
 * The melt runs the blocks and letters through a blur and a hard alpha threshold while the
 * blocks fade out and the letters fade in: the threshold keeps their union solid, and what is
 * farthest from any letter's stroke gives way first, so the blocks shrink onto the letters' shapes
 * rather than fading over them. The blur ends at nothing, so the letters land crisp.
 *
 * The dot is drawn, not set: the period in the name is only a spacer, so the dot that grows out
 * over the page is the very one that closed the name. With reduced motion the screen only fades
 * in and out.
 */
export function LoadingScreen() {
  useSyncExternalStore(onLoadingChange, loadingVersion, () => 0);
  const label = loadingLabel();
  const [shown, setShown] = useState(false);

  // The caption keeps the last label while the screen plays its way out.
  const [caption, setCaption] = useState(label ?? "");
  if (label !== undefined && label !== caption) setCaption(label);

  const screenRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const discRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (label === undefined || shown) return;
    const timer = window.setTimeout(() => setShown(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [label, shown]);

  useEffect(() => {
    const screen = screenRef.current;
    const name = nameRef.current;
    const captionBox = captionRef.current;
    const disc = discRef.current;
    const ink = inkRef.current;
    const blur = blurRef.current;
    if (!shown || !screen || !name || !captionBox || !disc || !ink || !blur) return;

    const letters = [...name.querySelectorAll<HTMLElement>("[data-letter]")];
    const period = name.querySelector<HTMLElement>("[data-period]");
    const blocks = [...name.querySelectorAll<HTMLElement>("[data-block]")];
    const dot = name.querySelector<HTMLElement>("[data-dot]");
    if (!period || !dot || blocks.length !== letters.length) return;

    const animations: Animation[] = [];
    let canceled = false;
    let meltFrame = 0;
    const play = (element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(keyframes, { fill: "both", ...options });
      animations.push(animation);
      return animation;
    };

    // The blocks sit over the letters' ink and the dot over the period's, and the caption lines
    // up with the R's ink rather than its box, measured afresh whenever the name resizes.
    const fit = () => {
      const inks = letters.map((letter) => inkBox(letter, ink.getBoundingClientRect()));
      if (inks.every((box) => box !== undefined)) {
        blockCells(inks).forEach((cell, index) => place(blocks[index]!, cell));
        captionBox.style.marginLeft = `${inks[0]!.left}px`;
      }
      const periodInk = inkBox(period, name.getBoundingClientRect());
      if (periodInk) place(dot, dotSquare(periodInk));
    };
    const observer = new ResizeObserver(fit);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The blocks fade out as the letters fade in, through the melt filter, whose blur swells
    // and settles back to nothing. Each block trails the one before it a little.
    const melt = () =>
      new Promise<void>((resolve) => {
        const most = parseFloat(getComputedStyle(name).fontSize) * MORPH_BLUR;
        const span = 1 - MORPH_STAGGER * (blocks.length - 1);
        for (const letter of letters) {
          letter.style.opacity = "0";
          letter.style.visibility = "visible";
        }
        ink.style.filter = `url(#${MELT_FILTER})`;
        const start = performance.now();
        const step = (now: number) => {
          if (canceled) return resolve();
          const t = Math.min(1, (now - start) / MORPH_MS);
          blur.setAttribute("stdDeviation", String(most * Math.sin(Math.PI * t)));
          blocks.forEach((block, index) => {
            const local = (t - index * MORPH_STAGGER) / span;
            block.style.opacity = String(1 - smooth(local / 0.8));
            letters[index]!.style.opacity = String(smooth(local / 0.5));
          });
          if (t < 1) {
            meltFrame = requestAnimationFrame(step);
            return;
          }
          ink.style.filter = "";
          for (const block of blocks) block.style.visibility = "hidden";
          resolve();
        };
        meltFrame = requestAnimationFrame(step);
      });

    const comeIn = async () => {
      // The screen slides up over the page, or fades in for reduced motion, while the face loads.
      const arrival = reducedMotion
        ? play(screen, [{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS })
        : play(screen, [{ translate: "0 100%" }, { translate: "0 0" }], { duration: SLIDE_MS, easing: TRAVEL });
      await Promise.all([arrival.finished, Promise.race([document.fonts.ready, wait(FONT_WAIT_MS)])]);
      if (canceled) return;
      fit();
      observer.observe(name);

      if (reducedMotion) {
        for (const letter of letters) letter.style.visibility = "visible";
        dot.style.clipPath = "inset(0% round 50%)";
        play(name, [{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS });
        play(captionBox, [{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS });
        return;
      }
      name.style.opacity = "1";

      // Each block appears as a dot on the baseline, as wide as the block, and stretches up.
      blocks.forEach((block, index) => {
        const width = block.offsetWidth;
        const height = block.offsetHeight;
        const radius = width / 2;
        play(
          block,
          [
            { clipPath: `inset(${height - radius}px ${radius}px ${radius}px ${radius}px round ${radius}px)`, easing: TRAVEL },
            { clipPath: `inset(${height - width}px 0px 0px 0px round ${radius}px)`, offset: DOT_AT, easing: TRAVEL },
            { clipPath: `inset(0px 0px 0px 0px round 0px)` },
          ],
          { duration: RISE_MS, delay: index * RISE_STAGGER_MS },
        );
      });
      await play(dot, [{ clipPath: "inset(50% 50% 50% 50% round 50%)" }, { clipPath: "inset(0% 0% 0% 0% round 50%)" }], {
        duration: RISE_MS * DOT_AT * 1.5,
        delay: blocks.length * RISE_STAGGER_MS,
        easing: TRAVEL,
      }).finished;
      if (canceled) return;

      play(captionBox, [{ opacity: 0, translate: "0 0.5rem" }, { opacity: 1, translate: "0 0" }], {
        duration: 300,
        delay: MORPH_MS * 0.5,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
      await melt();
      if (canceled) return;
      await wait(READ_MS);
    };

    const goOut = async () => {
      // From here the letters move, so they're no longer where a fresh measure would put them.
      observer.disconnect();
      if (reducedMotion) {
        await play(screen, [{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS }).finished;
        return;
      }

      play(captionBox, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 });

      // The dot swells to the letters' height and stretches back along them, a pill with the
      // period's round ends, eating each letter as its leading edge passes over. It is drawn over
      // the letters, so each is simply gone once covered.
      const origin = name.getBoundingClientRect();
      const inks = letters.map((letter) => inkBox(letter, origin)).filter((box) => box !== undefined);
      const from = { top: dot.offsetTop, left: dot.offsetLeft, right: dot.offsetLeft + dot.offsetWidth, bottom: dot.offsetTop + dot.offsetHeight };
      const top = Math.min(...inks.map((box) => box.top));
      const bottom = Math.max(...inks.map((box) => box.bottom));
      const margin = (bottom - top) * EAT_MARGIN;
      const pill: Box = {
        top: top - margin,
        bottom: bottom + margin,
        left: Math.min(...inks.map((box) => box.left)) - margin,
        right: from.right + margin,
      };
      const swollen: Box = { ...pill, left: pill.right - (pill.bottom - pill.top) };
      // A pill's ends stay round however long it gets, which a clip's percentage radius can't keep.
      for (const animation of dot.getAnimations()) animation.cancel();
      dot.style.clipPath = "none";
      dot.style.borderRadius = "9999px";
      await play(dot, [{ ...frame(from), easing: TRAVEL }, { ...frame(swollen), offset: SWELL_AT, easing: TRAVEL }, frame(pill)], {
        duration: EAT_MS,
      }).finished;
      if (canceled) return;
      for (const letter of letters) letter.style.visibility = "hidden";

      // Full, it compresses back down to a dot in the middle of where the name was.
      const side = from.right - from.left;
      const middle = { x: (pill.left + pill.right) / 2, y: (pill.top + pill.bottom) / 2 };
      const compressed: Box = { top: middle.y - side / 2, bottom: middle.y + side / 2, left: middle.x - side / 2, right: middle.x + side / 2 };
      await play(dot, [frame(pill), frame(compressed)], { duration: COMPRESS_MS, easing: TRAVEL }).finished;
      if (canceled) return;

      // The disc takes over from the dot exactly where it is, then grows from there to the
      // middle of the screen and past every corner.
      const width = window.innerWidth;
      const height = window.innerHeight;
      const radius = (Math.hypot(width, height) / 2) * OVERREACH;
      const start = center(dot);
      const scale = dot.getBoundingClientRect().width / (2 * radius);
      place(disc, { top: height / 2 - radius, left: width / 2 - radius, bottom: height / 2 + radius, right: width / 2 + radius });
      disc.style.visibility = "visible";
      dot.style.visibility = "hidden";
      play(
        disc,
        [{ transform: `translate(${start.x - width / 2}px, ${start.y - height / 2}px) scale(${scale})` }, { transform: "none" }],
        { duration: GROW_MS, easing: TRAVEL },
      );
      // The dot covers the screen a little before it is full grown, and the hole opens from then.
      await wait(GROW_MS * COVERED_AT);
      if (canceled) return;

      // Only the yellow is left on screen: the page beneath shows through its hole.
      screen.style.background = "transparent";
      screen.style.pointerEvents = "none";
      name.style.visibility = "hidden";
      await play(disc, [{ "--hole": "0%" }, { "--hole": "100%" }], { duration: OPEN_MS, easing: OPEN_EASE }).finished;
    };

    void (async () => {
      try {
        await comeIn();
        if (canceled) return;
        await released();
        if (canceled) return;
        await goOut();
      } catch {
        // Canceled: the screen was taken down mid-play.
        return;
      }
      if (!canceled) setShown(false);
    })();

    return () => {
      canceled = true;
      cancelAnimationFrame(meltFrame);
      observer.disconnect();
      for (const animation of animations) animation.cancel();
      for (const element of [screen, name, ink, captionBox, disc, dot, ...letters, ...blocks]) element.removeAttribute("style");
      blur.setAttribute("stdDeviation", "0");
    };
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      ref={screenRef}
      data-loading-screen
      role="status"
      // Below the page until it slides up, or unseen until it fades in. Nothing on it is for selecting.
      className="fixed inset-0 z-50 bg-paper text-ink select-none motion-safe:translate-y-full motion-reduce:opacity-0"
    >
      {/* The rule leading the screen up the page; at rest it sits just above the top edge. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-full h-1 bg-ink" />
      <div className="flex size-full items-center justify-center px-4">
        <div className="flex max-w-full flex-col items-start gap-6">
          <p
            ref={nameRef}
            aria-hidden="true"
            className="relative font-display text-[clamp(4rem,22vw,15rem)] font-bold leading-none tracking-tight whitespace-nowrap opacity-0"
          >
            <span ref={inkRef} className="relative inline-block">
              {LETTERS.map((letter, index) => (
                <span key={index} data-letter className="invisible relative inline-block">
                  {letter}
                </span>
              ))}
              {LETTERS.map((letter, index) => (
                <span
                  key={index}
                  data-block
                  className="pointer-events-none absolute bg-ink [clip-path:inset(50%_50%_50%_50%)]"
                />
              ))}
            </span>
            <span data-period className="text-transparent">
              .
            </span>
            <span data-dot className="pointer-events-none absolute z-10 bg-highlight [clip-path:inset(50%_50%_50%_50%)]" />
          </p>
          <p ref={captionRef} className="text-base font-semibold text-mute opacity-0 sm:text-lg">
            <span className="sr-only">Loading: </span>
            {caption}
          </p>
        </div>
      </div>
      {/* Blurs what it filters, then cuts the blur back to hard edges at half opacity. */}
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={MELT_FILTER} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="0" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 36 -17" />
        </filter>
      </svg>
      <div
        ref={discRef}
        aria-hidden="true"
        className="loading-disc invisible pointer-events-none absolute rounded-full bg-highlight"
      />
    </div>
  );
}
