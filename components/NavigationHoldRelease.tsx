"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { releaseNavigationHold } from "@/components/loadingHolds";

/** Releases a link's hold on the loading screen once the route it opened has rendered. */
export function NavigationHoldRelease() {
  const pathname = usePathname();
  useEffect(() => {
    releaseNavigationHold();
  }, [pathname]);
  return null;
}
