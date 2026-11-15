"use client";

import { useEffect } from "react";
import { useMapMove, type HomePanel } from "@/components/HomePager";
import { MAP_MOVES, type MapPlace } from "@/components/mapMoves";
import { arrowKey, attachScrollPaging, pageTransitionRunning, type Direction } from "@/components/scrollPaging";

/**
 * Lets a page that scrolls as a whole be left by scrolling or swiping toward a neighbor on the
 * map, once it is scrolled to that edge. The arrow keys do the same. Home moves between its own
 * panels in HomePager instead.
 */
export function MapGestures({ place }: { place: Exclude<MapPlace, HomePanel> }) {
  const mapMove = useMapMove();

  useEffect(() => {
    const html = document.documentElement;
    // Otherwise a sideways trackpad swipe would also go Back or Forward in the browser.
    const overscroll = html.style.overscrollBehaviorX;
    html.style.overscrollBehaviorX = "none";

    const atEdge: Record<Direction, () => boolean> = {
      up: () => window.scrollY <= 0,
      down: () => window.scrollY + window.innerHeight >= html.scrollHeight - 1,
      left: () => true,
      right: () => true,
    };
    let leaving = false;
    const leavesFor = (direction: Direction) => {
      const move = MAP_MOVES[place][direction];
      if (!move || !atEdge[direction]()) return undefined;
      return () => {
        leaving = true;
        mapMove(move);
      };
    };
    // Swallow the rest of the gesture while the next page loads. This page is gone once it has.
    const detach = attachScrollPaging(window, { leavesFor, locked: () => leaving });

    const onKeyDown = (event: KeyboardEvent) => {
      const direction = arrowKey(event);
      if (!direction) return;
      if (leaving || pageTransitionRunning()) {
        event.preventDefault();
        return;
      }
      const move = leavesFor(direction);
      // A held Up or Down that was scrolling the page stops at its edge; the next press crosses it.
      if (!move || (event.repeat && (direction === "up" || direction === "down"))) return;
      event.preventDefault();
      move();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      detach();
      html.style.overscrollBehaviorX = overscroll;
    };
  }, [place, mapMove]);

  return null;
}
