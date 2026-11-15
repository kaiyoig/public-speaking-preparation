import type { HomePanel } from "@/components/HomePager";
import type { Direction } from "@/components/scrollPaging";
import { TRANSITION } from "@/components/transitions";

/** A move to a neighbor on the map, a page or one of Home's panels, with the slide that gets there. */
export type MapMove = { transition: string } & ({ href: string } | { panel: HomePanel });

/** The places a scroll or swipe can move between. Sessions and session records aren't among them. */
export type MapPlace = HomePanel | "about" | "history";

/**
 * Where a scroll or swipe leads from each place on the map. Title and About sit side by side on
 * top, with Modes and History beneath them. The diagonals are crossed only by link, and the move
 * between Home's own panels belongs to HomePager, so neither is listed here.
 */
export const MAP_MOVES: Record<MapPlace, Partial<Record<Direction, MapMove>>> = {
  title: { right: { href: "/about", transition: TRANSITION.toAbout } },
  modes: { right: { href: "/history", transition: TRANSITION.modesToHistory } },
  about: {
    left: { panel: "title", transition: TRANSITION.fromAbout },
    down: { href: "/history", transition: TRANSITION.aboutToHistory },
  },
  history: {
    left: { panel: "modes", transition: TRANSITION.historyToModes },
    up: { href: "/about", transition: TRANSITION.historyToAbout },
  },
};
