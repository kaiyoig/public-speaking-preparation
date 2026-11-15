"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MAP_MOVES, type MapMove } from "@/components/mapMoves";
import { arrowKey, attachScrollPaging, pageTransitionRunning, type Direction } from "@/components/scrollPaging";

/** The panels, top to bottom. */
const VIEWS = ["title", "modes"] as const;

type View = (typeof VIEWS)[number];

export type HomePanel = View;

/** The URL hash each panel is kept under. The Title panel has none: any other hash shows it. */
const HASHES: Partial<Record<View, string>> = { modes: "#modes" };

/** How far the stack of panels is shifted up to bring each one on screen. */
const SHIFT: Record<View, string> = { title: "", modes: "-translate-y-1/2" };

/** How long the slide between panels takes. Scroll input is ignored until it has finished. */
const SLIDE_MS = 600;

const panelHref = (view: View) => `/${HASHES[view] ?? ""}`;

const viewFromHash = (): View => VIEWS.find((view) => HASHES[view] === window.location.hash) ?? "title";

const subscribeNever = () => () => {};

/** True while hydrating server HTML, which can't know the hash; false when Home mounts on a client navigation. */
const useHydrating = () =>
  useSyncExternalStore(
    subscribeNever,
    () => false,
    () => true,
  );

/**
 * The panel a HomePanelLink is heading for. A client navigation renders Home before the URL
 * changes, so the hash can't say which panel to open yet.
 */
let requestedView: View | undefined;

interface HomePanelLinkProps {
  panel: View;
  transitionTypes?: string[];
  className?: string;
  children: ReactNode;
}

/** Within Home, brings a panel on screen and records it in the URL as a new history entry. */
const GoToPanel = createContext<((view: View) => void) | null>(null);

/**
 * A link to one of Home's panels. From another page, Home opens straight on that panel, so a
 * page transition into Home pictures the panel the Speaker asked for. From Home itself, it slides
 * to the panel: a navigation within Home doesn't remount it, and the URL changing alone wouldn't move it.
 */
export function HomePanelLink({ panel, ...props }: HomePanelLinkProps) {
  const goToPanel = useContext(GoToPanel);

  return (
    <Link
      {...props}
      href={panelHref(panel)}
      onClick={(event) => {
        // Leave modified clicks alone, so they can still open Home in a new tab.
        if (!goToPanel || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        goToPanel(panel);
      }}
      onNavigate={() => {
        requestedView = panel;
      }}
    />
  );
}

/**
 * Goes to a neighbor on the map with the slide its link would use. A move to one of Home's panels
 * opens Home on that panel, as a HomePanelLink does.
 */
export function useMapMove() {
  const router = useRouter();
  return useCallback(
    (move: MapMove) => {
      if ("panel" in move) requestedView = move.panel;
      router.push("panel" in move ? panelHref(move.panel) : move.href, { transitionTypes: [move.transition] });
    },
    [router],
  );
}

type HomePagerProps = Record<View, ReactNode>;

const PanelShowing = createContext(false);

/** Whether the panel this is rendered in is the one on screen. Lets a panel start and stop its own motion. */
export const usePanelShowing = () => useContext(PanelShowing);

/**
 * Home as two full-screen panels, Title above Modes, with nothing in between:
 * scrolling down slides straight to Modes, and scrolling up slides straight back
 * to Title. The view never rests part-way.
 *
 * A panel taller than the screen scrolls inside itself first, and only hands over
 * to its neighbor from its own edge. Scrolling sideways, or the Left and Right arrow
 * keys, leave Home for the page beside the panel: About beside Title, History beside Modes.
 *
 * The showing panel is kept in the URL hash, so links to `#modes` change panel,
 * and Back from a Session returns to Modes.
 */
export function HomePager(panels: HomePagerProps) {
  const hydrating = useHydrating();
  // A page transition into Home pictures its first render, so open on the right panel straight
  // away rather than correcting it after: that would slide in Title, then jump.
  const [view, setView] = useState<View>(() => (hydrating ? "title" : (requestedView ?? viewFromHash())));
  // Off until the Speaker moves between panels, so opening on #modes doesn't slide in.
  const [animated, setAnimated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Partial<Record<View, HTMLDivElement | null>>>({});
  const viewRef = useRef<View>(view);
  const lockedUntil = useRef(0);

  const mapMove = useMapMove();

  const show = useCallback((next: View) => {
    if (viewRef.current === next) return;
    viewRef.current = next;
    lockedUntil.current = performance.now() + SLIDE_MS;
    setAnimated(true);
    setView(next);
  }, []);

  const goToPanel = useCallback(
    (next: View) => {
      if (viewRef.current === next) return;
      window.history.pushState(window.history.state, "", HASHES[next] ?? window.location.pathname);
      show(next);
    },
    [show],
  );

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
    /**
     * What moving in this direction does: up or down, change panel once the current one is at that
     * edge; sideways, leave Home for the page beside the panel.
     */
    const leavesFor = (direction: Direction) => {
      if (direction === "left" || direction === "right") {
        const move = MAP_MOVES[viewRef.current][direction];
        if (!move) return undefined;
        return () => {
          // Swallow the rest of the gesture while the next page loads. Home is gone once it has.
          lockedUntil.current = Infinity;
          mapMove(move);
        };
      }
      const down = direction === "down";
      const next = (down ? atEnd() : atStart()) ? neighbor(down) : undefined;
      return next && (() => go(next));
    };

    requestedView = undefined;

    // After hydration, open on whatever the URL says, without a slide.
    const initial = viewFromHash();
    if (initial !== viewRef.current) {
      viewRef.current = initial;
      setView(initial);
    }
    const onHashChange = () => show(viewFromHash());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const onControl = event.target instanceof Element && event.target.closest("a, button, input, textarea, select");
      const space = event.key === " " && !onControl;
      const down = event.key === "ArrowDown" || event.key === "PageDown" || event.key === "End" || (space && !event.shiftKey);
      const up = event.key === "ArrowUp" || event.key === "PageUp" || event.key === "Home" || (space && event.shiftKey);
      const arrow = arrowKey(event);
      const sideways = arrow === "left" || arrow === "right" ? arrow : undefined;
      if (!down && !up && !sideways) return;
      if (performance.now() < lockedUntil.current || pageTransitionRunning()) {
        event.preventDefault();
        return;
      }
      const move = leavesFor(sideways ?? (down ? "down" : "up"));
      if (!move) {
        if (sideways) return;
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
      move();
    };

    const detachScrollPaging = attachScrollPaging(container, {
      leavesFor,
      locked: () => performance.now() < lockedUntil.current,
    });
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("keydown", onKeyDown);
      detachScrollPaging();
    };
  }, [show, mapMove]);


  return (
    <div ref={containerRef} data-pager className="fixed inset-0 overflow-clip">
      <div
        className={`h-[200%] ${SHIFT[view]} ${
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
            className="h-1/2 overflow-y-auto overscroll-contain outline-none"
          >
            <GoToPanel value={goToPanel}>
              <PanelShowing value={view === name}>{panels[name]}</PanelShowing>
            </GoToPanel>
          </div>
        ))}
      </div>
    </div>
  );
}
