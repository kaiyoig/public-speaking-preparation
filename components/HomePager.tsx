"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type View = "about" | "modes";

/** The URL hash that means the Modes panel is showing. Anything else shows the About panel. */
const MODES_HASH = "#modes";

/** How long the slide between panels takes. Scroll input is ignored until it has finished. */
const SLIDE_MS = 600;

/** A wheel event this soon after one that scrolled a panel belongs to the same gesture. */
const SAME_GESTURE_MS = 200;

/** How far a finger has to travel before a swipe changes panel. */
const SWIPE_PX = 48;

const viewFromHash = (): View => (window.location.hash === MODES_HASH ? "modes" : "about");

interface HomePagerProps {
  about: ReactNode;
  modes: ReactNode;
}

/**
 * Home as two full-screen panels, About above Modes, with nothing in between:
 * scrolling down from About slides straight to Modes, and scrolling up from Modes
 * slides straight back. The view never rests part-way.
 *
 * A panel taller than the screen scrolls inside itself first, and only hands over
 * to the other panel from its own edge.
 *
 * The showing panel is kept in the URL hash, so links to `#modes` and `#about`
 * change panel, and Back from a Session returns to Modes.
 */
export function HomePager({ about, modes }: HomePagerProps) {
  const [view, setView] = useState<View>("about");
  // Off until the Speaker moves between panels, so opening on #modes doesn't slide in.
  const [animated, setAnimated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>("about");
  const lockedUntil = useRef(0);

  const show = useCallback((next: View) => {
    if (viewRef.current === next) return;
    viewRef.current = next;
    lockedUntil.current = performance.now() + SLIDE_MS;
    setAnimated(true);
    setView(next);
  }, []);

  // Focus follows the panel once it stops being inert, so the keyboard scrolls it and Tab starts inside it.
  useEffect(() => {
    if (animated) (view === "about" ? aboutRef : modesRef).current?.focus({ preventScroll: true });
  }, [view, animated]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /** Scroll or key input: change panel, and record the change in the URL without adding history. */
    const go = (next: View) => {
      window.history.replaceState(window.history.state, "", next === "modes" ? MODES_HASH : window.location.pathname);
      show(next);
    };

    const panel = () => (viewRef.current === "about" ? aboutRef : modesRef).current;
    const atStart = () => (panel()?.scrollTop ?? 0) <= 0;
    const atEnd = () => {
      const el = panel();
      return !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    };
    /** True when moving in this direction would leave the current panel from its edge. */
    const leaves = (down: boolean) => (viewRef.current === "about" ? down && atEnd() : !down && atStart());

    // Open on whatever the URL says, without a slide.
    const initial = viewFromHash();
    if (initial !== viewRef.current) {
      viewRef.current = initial;
      setView(initial);
    }
    const onHashChange = () => show(viewFromHash());

    let lastInnerScroll = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      const now = performance.now();
      if (now < lockedUntil.current) {
        // Swallow the tail of the gesture that caused the slide.
        event.preventDefault();
        return;
      }
      // A gesture that was scrolling inside the panel stops at the edge; the next one crosses it.
      if (!leaves(event.deltaY > 0) || now - lastInnerScroll < SAME_GESTURE_MS) {
        lastInnerScroll = now;
        return;
      }
      event.preventDefault();
      go(viewRef.current === "about" ? "modes" : "about");
    };

    let touchStartY: number | null = null;
    let touchStartedAtStart = false;
    let touchStartedAtEnd = false;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      touchStartY = touch ? touch.clientY : null;
      touchStartedAtStart = atStart();
      touchStartedAtEnd = atEnd();
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || touchStartY === null || performance.now() < lockedUntil.current) return;
      const travelled = touch.clientY - touchStartY;
      if (Math.abs(travelled) < SWIPE_PX) return;
      touchStartY = null;
      // Swiping up moves down the page. The swipe has to start with the panel already at its edge.
      const down = travelled < 0;
      const startedAtEdge = down ? touchStartedAtEnd : touchStartedAtStart;
      if (startedAtEdge && leaves(down)) go(viewRef.current === "about" ? "modes" : "about");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const onControl = event.target instanceof Element && event.target.closest("a, button, input, textarea, select");
      const space = event.key === " " && !onControl;
      const down = event.key === "ArrowDown" || event.key === "PageDown" || event.key === "End" || (space && !event.shiftKey);
      const up = event.key === "ArrowUp" || event.key === "PageUp" || event.key === "Home" || (space && event.shiftKey);
      if (!down && !up) return;
      if (performance.now() < lockedUntil.current) {
        event.preventDefault();
        return;
      }
      if (!leaves(down)) {
        // Before anything has focus the keys reach no scroller, so scroll the panel for them.
        if (document.activeElement === document.body) {
          event.preventDefault();
          const el = panel();
          const step = event.key.startsWith("Arrow") ? 40 : (el?.clientHeight ?? 0) * 0.9;
          el?.scrollBy({ top: down ? step : -step });
        }
        return;
      }
      event.preventDefault();
      go(viewRef.current === "about" ? "modes" : "about");
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("keydown", onKeyDown);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
    };
  }, [show]);

  const panelClass = "h-1/2 overflow-y-auto overscroll-contain outline-none";

  return (
    <div ref={containerRef} data-pager className="fixed inset-0 overflow-clip">
      <div
        className={`h-[200%] ${view === "modes" ? "-translate-y-1/2" : ""} ${
          animated ? "motion-safe:transition-transform motion-safe:duration-600 motion-safe:ease-[cubic-bezier(0.7,0,0.2,1)]" : ""
        }`}
      >
        {/* The panel that is off screen is inert: it can't take focus and isn't read out. */}
        <div ref={aboutRef} tabIndex={-1} inert={view !== "about"} className={panelClass}>
          {about}
        </div>
        <div ref={modesRef} tabIndex={-1} inert={view !== "modes"} className={panelClass}>
          {modes}
        </div>
      </div>
    </div>
  );
}
