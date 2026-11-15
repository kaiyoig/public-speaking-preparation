/** The four ways a gesture can cross the app's map. */
export type Direction = "up" | "down" | "left" | "right";

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** A wheel event this soon after one that scrolled the page belongs to the same gesture. */
const SAME_GESTURE_MS = 200;

/** How far a finger has to travel before a swipe moves on. */
const SWIPE_PX = 48;

/** How far one wheel event has to push sideways to count. Less is drift in a vertical scroll. */
const SIDEWAYS_MIN_PX = 4;

/** Roughly how many pixels a wheel delta given in lines or pages stands for. */
const LINE_PX = 16;

const ARROWS: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

/**
 * The way an arrow key moves across the map. Undefined for any other key, with a modifier held
 * (Alt+Left is the browser's Back), or while typing, where the arrows move the caret.
 */
export function arrowKey(event: KeyboardEvent): Direction | undefined {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return undefined;
  if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return undefined;
  return ARROWS[event.key];
}

interface ScrollPagingOptions {
  /**
   * What moving in this direction does. Undefined where nothing lies that way, or where the page
   * still has scrolling to do before it reaches that edge.
   */
  leavesFor: (direction: Direction) => (() => void) | undefined;
  /** True while a move is still playing out. Input is swallowed until it has finished. */
  locked: () => boolean;
}

/**
 * Turns wheel and swipe gestures on `target` into moves across the map: up, down or sideways,
 * whichever way the gesture mostly goes. A gesture that was scrolling the page stops at its edge;
 * the next one crosses it. Returns a function that stops listening.
 */
export function attachScrollPaging(target: HTMLElement | Window, { leavesFor, locked }: ScrollPagingOptions) {
  let lastInnerScroll = 0;
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? 1 : LINE_PX;
    const x = event.deltaX * unit;
    const y = event.deltaY * unit;
    if (x === 0 && y === 0) return;
    const now = performance.now();
    if (locked()) {
      // Swallow the tail of the gesture that caused the move.
      event.preventDefault();
      return;
    }
    const sideways = Math.abs(x) > Math.abs(y);
    if (sideways && Math.abs(x) < SIDEWAYS_MIN_PX) return;
    const direction: Direction = sideways ? (x > 0 ? "right" : "left") : y > 0 ? "down" : "up";
    const move = leavesFor(direction);
    if (!move || now - lastInnerScroll < SAME_GESTURE_MS) {
      lastInnerScroll = now;
      return;
    }
    event.preventDefault();
    move();
  };

  let touchStart: { x: number; y: number; ready: Direction[] } | null = null;
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    // A swipe has to start with the page already at the edge it leaves from.
    touchStart = touch ? { x: touch.clientX, y: touch.clientY, ready: DIRECTIONS.filter((d) => leavesFor(d)) } : null;
  };
  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch || !touchStart || locked()) return;
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    const { ready } = touchStart;
    touchStart = null;
    // Swiping up moves down the map, and swiping left moves right.
    const direction: Direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "right" : "left") : dy < 0 ? "down" : "up";
    if (ready.includes(direction)) leavesFor(direction)?.();
  };

  target.addEventListener("wheel", onWheel as EventListener, { passive: false });
  target.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
  target.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
  return () => {
    target.removeEventListener("wheel", onWheel as EventListener);
    target.removeEventListener("touchstart", onTouchStart as EventListener);
    target.removeEventListener("touchmove", onTouchMove as EventListener);
  };
}
