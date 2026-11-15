"use client";

import { useEffect, useState } from "react";
import { useLoadingScreen } from "@/components/LoadingScreen";

/**
 * Holds the loading screen for `label` until any key or click lets it go, then offers to hold it
 * again. The screen covers the page while held, so input anywhere counts.
 */
export function LoadingPreviewHold({ label }: { label: string }) {
  const [holding, setHolding] = useState(true);
  useLoadingScreen(label, holding);

  useEffect(() => {
    if (!holding) return;
    const finish = () => setHolding(false);
    // Not the click that held it again.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", finish, { once: true });
      window.addEventListener("keydown", finish, { once: true });
    });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", finish);
      window.removeEventListener("keydown", finish);
    };
  }, [holding]);

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-lg">
        {holding ? "Press any key or click to finish loading." : "Loaded."}
      </p>
      <button type="button" className="btn-primary" disabled={holding} onClick={() => setHolding(true)}>
        Load again
      </button>
    </div>
  );
}
