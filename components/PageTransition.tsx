import { ViewTransition, type ReactNode } from "react";
import { PAGE_MOTION } from "@/components/transitions";

/**
 * Wraps a page so it slides or fades as a whole on the navigations that carry a transition type.
 * Belongs in each page, not the layout: the layout stays mounted, so it never enters or leaves.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={PAGE_MOTION} exit={PAGE_MOTION} default="none">
      {children}
    </ViewTransition>
  );
}
