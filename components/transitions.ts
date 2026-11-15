import { addTransitionType, startTransition, type ViewTransitionClassPerType } from "react";

/**
 * The kinds of move the app makes, passed as transition types on each navigation or Phase change.
 * The app is laid out as a map: About sits to the right of Home, a Session sits beneath it,
 * and a Session's Phases run downward in the rail.
 */
export const TRANSITION = {
  /** Home slides off to the left and About slides in from the right. */
  toAbout: "to-about",
  /** About slides back off to the right and Home slides in from the left. */
  fromAbout: "from-about",
  /** Into a Mode from Home: the Mode's title shrinks into the rail, the Session rises in. */
  enterSession: "enter-session",
  /** Back to Home from a Session: the Session sinks away. */
  leaveSession: "leave-session",
  /** On to the next Phase: the old one lifts away, the next rises in, the marker moves down the rail. */
  phaseForward: "phase-forward",
  /** Practice again: everything runs the other way. */
  phaseBack: "phase-back",
} as const;

/**
 * How a whole page enters and leaves on a navigation. Each type names the CSS class
 * of the same name in globals.css. Anything else, such as the browser's Back button, doesn't animate.
 */
export const PAGE_MOTION: ViewTransitionClassPerType = {
  [TRANSITION.toAbout]: TRANSITION.toAbout,
  [TRANSITION.fromAbout]: TRANSITION.fromAbout,
  [TRANSITION.enterSession]: TRANSITION.enterSession,
  [TRANSITION.leaveSession]: TRANSITION.leaveSession,
  default: "none",
};

/** How a Phase's content enters and leaves when the Session moves between Phases. */
export const PHASE_MOTION: ViewTransitionClassPerType = {
  [TRANSITION.phaseForward]: TRANSITION.phaseForward,
  [TRANSITION.phaseBack]: TRANSITION.phaseBack,
  default: "none",
};

/** The rail glides to its new place when Delivery's denser layout comes and goes. */
export const RAIL_GLIDE: ViewTransitionClassPerType = {
  [TRANSITION.phaseForward]: "glide",
  [TRANSITION.phaseBack]: "glide",
  default: "none",
};

/**
 * Applies a Phase change as a transition, so the Phase content, the rail and the marker animate.
 * A plain state update would swap the Phase without any motion.
 */
export function changePhase(direction: "forward" | "back", update: () => void) {
  startTransition(() => {
    addTransitionType(direction === "forward" ? TRANSITION.phaseForward : TRANSITION.phaseBack);
    update();
  });
}
