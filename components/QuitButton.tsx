"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/** "Quit" with a confirmation. Capture is stopped by the unmounting Phase (see useSpeechCapture). */
export function QuitButton({ onQuit, disabled = false }: { onQuit: () => void; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} disabled={disabled} className="btn-secondary">
        Quit
      </button>
      <ConfirmDialog
        open={confirming}
        title="Quit this Session?"
        message="Quit this Session? Nothing will be saved."
        confirmLabel="Quit"
        cancelLabel="Keep going"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onQuit();
        }}
      />
    </>
  );
}
