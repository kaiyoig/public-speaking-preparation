"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** The panels, top to bottom. */
const VIEWS = ["title", "about", "modes"] as const;

type View = (typeof VIEWS)[number];

/** The URL hash each panel is kept under. The Title panel has none: any other hash shows it. */
const HASHES: Partial<Record<View, string>> = { about: "#about", modes: "#modes" };

/** How far the stack of panels is shifted up to bring each one on screen. */
const SHIFT: Record<View, string> = { title: "", about: "-translate-y-1/3", modes: "-translate-y-2/3" };

/** How long the slide between panels takes. Scroll input is ignored until it has finished. */
const SLIDE_MS = 600;

/** A wheel event this soon after one that scrolled a panel belongs to the same gesture. */
const SAME_GESTURE_MS = 200;

/** How far a finger has to travel before a swipe changes panel. */
const SWIPE_PX = 48;

const viewFromHash = (): View => VIEWS.find((view) => HASHES[view] === window.location.hash) ?? "title";

type HomePagerProps = Record<View, ReactNode>;

const PanelShowing = createContext(false);

/** Whether the panel this is rendered in is the one on screen. Lets a panel start and stop its own motion. */
export const usePanelShowing = () => useContext(PanelShowing);

/**
 * Home as three full-screen panels, Title above About above Modes, with nothing in
 * between: scrolling down slides straight to the next panel, and scrolling up slides
 * straight back to the one before. The view never rests part-way.
 *
 * A panel taller than the screen scrolls inside itself first, and only hands over
 * to its neighbor from its own edge.
 *
 * The showing panel is kept in the URL hash, so links to `#about` and `#modes`
 * change panel, and Back from a Session returns to Modes.
 */
export function HomePager(panels: HomePagerProps) {
  const [view, setView] = useState<View>("title");
  // Off until the Speaker moves between panels, so opening on #modes doesn't slide in.
  const [animated, setAnimated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Partial<Record<View, HTMLDivElement | null>>>({});
  const viewRef = useRef<View>("title");
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
    if (animated) panelRefs.current[view]?.focus({ preventScroll: true });
  }, [view, animated]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /** Scroll or key input: change panel, and record the change in the URL without adding history. */
    const go = (next: View) => {
      window.history.replaceState(window.history.state, "", HASHES[next] ?? window.location.pathname);
      show(next);
    };

    const panel = () => panelRefs.current[viewRef.current];
    /** The panel below the current one, or above it. Undefined past either end. */
    const neighbor = (down: boolean): View | undefined => VIEWS[VIEWS.indexOf(viewRef.current) + (down ? 1 : -1)];
    const atStart = () => (panel()?.scrollTop ?? 0) <= 0;
    const atEnd = () => {
      const el = panel();
      return !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    };
    /** The panel that moving in this direction leaves for, once the current one is at that edge. */
    const leavesFor = (down: boolean) => ((down ? atEnd() : atStart()) ? neighbor(down) : undefined);

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
      const next = leavesFor(event.deltaY > 0);
      if (!next || now - lastInnerScroll < SAME_GESTURE_MS) {
        lastInnerScroll = now;
        return;
      }
      event.preventDefault();
      go(next);
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
      const traveled = touch.clientY - touchStartY;
      if (Math.abs(traveled) < SWIPE_PX) return;
      touchStartY = null;
      // Swiping up moves down the page. The swipe has to start with the panel already at its edge.
      const down = traveled < 0;
      const startedAtEdge = down ? touchStartedAtEnd : touchStartedAtStart;
      const next = startedAtEdge ? leavesFor(down) : undefined;
      if (next) go(next);
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
      const next = leavesFor(down);
      if (!next) {
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
      go(next);
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


  return (
    <div ref={containerRef} data-pager className="fixed inset-0 overflow-clip">
      <div
        className={`h-[300%] ${SHIFT[view]} ${
          animated ? "motion-safe:transition-transform motion-safe:duration-600 motion-safe:ease-[cubic-bezier(0.7,0,0.2,1)]" : ""
        }`}
      >
        {/* A panel that is off screen is inert: it can't take focus and isn't read out. */}
        {VIEWS.map((name) => (
          <div
            key={name}
            ref={(el) => {
              panelRefs.current[name] = el;
            }}
            tabIndex={-1}
            inert={view !== name}
            className="h-1/3 overflow-y-auto overscroll-contain outline-none"
          >
            <PanelShowing value={view === name}>{panels[name]}</PanelShowing>
          </div>
        ))}
      </div>
    </div>
  );
}
