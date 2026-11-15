import { ViewTransition } from "react";
import { TRANSITION } from "@/components/transitions";

/**
 * A Mode's name, as one object that carries across screens: choosing a Mode on Home shrinks
 * its title straight into the Session rail, so the Speaker sees where they went.
 */
export function ModeTitle({ children }: { children: string }) {
  return (
    <ViewTransition
      name={`mode-title-${children.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      share={{ [TRANSITION.enterSession]: "mode-morph", default: "none" }}
      default="none"
    >
      {/* Inline-block so the snapshot hugs the words, and both ends of the morph keep the same shape. */}
      <span className="inline-block">{children}</span>
    </ViewTransition>
  );
}
