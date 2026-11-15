import type { ViewTransitionClassPerType } from "react";

/**
 * The kinds of move the app makes, passed as transition types on each navigation.
 * The app is laid out as a map: About sits to the right of Home.
 */
export const TRANSITION = {
  /** Home slides off to the left and About slides in from the right. */
  toAbout: "to-about",
  /** About slides back off to the right and Home slides in from the left. */
  fromAbout: "from-about",
} as const;

/**
 * How a whole page enters and leaves on a navigation. Each type names the CSS class
 * of the same name in globals.css. Anything else, such as the browser's Back button, doesn't animate.
 */
export const PAGE_MOTION: ViewTransitionClassPerType = {
  [TRANSITION.toAbout]: TRANSITION.toAbout,
  [TRANSITION.fromAbout]: TRANSITION.fromAbout,
  default: "none",
};
