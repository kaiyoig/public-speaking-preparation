"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A modal confirm dialog built on the native <dialog> element. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md border-2 border-ink bg-paper p-6 text-ink backdrop:bg-black/60"
    >
      <h2 id="confirm-dialog-title" className="text-3xl font-bold leading-none tracking-tight font-display">
        {title}
      </h2>
      <p className="mt-3 text-lg">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary" autoFocus>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className="btn-primary">
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
