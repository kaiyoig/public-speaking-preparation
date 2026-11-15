import { ViewTransition } from "react";
import { RAIL_GLIDE, TRANSITION } from "@/components/transitions";

/** The highlight slides between numbers whichever way the Session moves. */
const MARKER_SLIDE = { [TRANSITION.phaseForward]: "marker", [TRANSITION.phaseBack]: "marker", default: "none" };

interface PhaseStepsProps<P extends string> {
  phases: readonly { id: P; label: string }[];
  current: P;
}

/**
 * Shows where the Session is: each Phase numbered in order, the current one set bold with its number highlighted.
 * Moving between Phases slides the highlight from the old number to the new one.
 */
export function PhaseSteps<P extends string>({ phases, current }: PhaseStepsProps<P>) {
  const currentIndex = phases.findIndex((phase) => phase.id === current);
  return (
    <ViewTransition update={RAIL_GLIDE} default="none">
      <ol aria-label="Phases" className="flex flex-wrap gap-x-5 gap-y-1 text-lg lg:flex-col lg:gap-y-1.5">
        {phases.map((phase, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li
              key={phase.id}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-baseline gap-2.5 ${
                state === "current" ? "font-bold text-ink" : state === "done" ? "text-ink" : "text-mute"
              }`}
            >
              {state === "current" ? (
                <ViewTransition name="phase-marker" share={MARKER_SLIDE} default="none">
                  <span className="w-6 bg-highlight text-center text-on-highlight tabular-nums">{index + 1}</span>
                </ViewTransition>
              ) : (
                <span className="w-6 text-center tabular-nums">{index + 1}</span>
              )}
              <span>{phase.label}</span>
            </li>
          );
        })}
      </ol>
    </ViewTransition>
  );
}
