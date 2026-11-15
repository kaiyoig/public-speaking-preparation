"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLoadingScreen } from "@/components/LoadingScreen";

type AsyncState<T> =
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "done"; value: T };

interface AsyncViewProps<T> {
  /** The promise-returning call. It runs on mount and again on each "Try again". */
  run: () => Promise<T>;
  /** What the loading screen says it is waiting for while the call is pending. */
  label: string;
  /** Extra buttons shown beside "Try again" when the call fails. */
  errorActions?: ReactNode;
  children: (value: T) => ReactNode;
}

/** Wraps an async call with the loading screen and an error-with-retry view. */
export function AsyncView<T>({ run, label, errorActions, children }: AsyncViewProps<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: "pending" });
  const [attempt, setAttempt] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;
  const inFlightRef = useRef<{ attempt: number; promise: Promise<T> } | null>(null);

  useEffect(() => {
    let canceled = false;
    setState({ status: "pending" });

    let promise: Promise<T>;
    if (inFlightRef.current && inFlightRef.current.attempt === attempt) {
      promise = inFlightRef.current.promise;
    } else {
      promise = runRef.current();
      inFlightRef.current = { attempt, promise };
    }

    promise.then(
      (value) => {
        if (!canceled) setState({ status: "done", value });
      },
      (error: unknown) => {
        if (!canceled) {
          setState({
            status: "error",
            message: errorMessage(error),
          });
        }
      },
    );
    return () => {
      canceled = true;
    };
  }, [attempt]);

  useLoadingScreen(label, state.status === "pending");

  // The loading screen covers the page meanwhile, and plays its way out over what comes next.
  if (state.status === "pending") return null;

  if (state.status === "error") {
    return <ErrorView message={state.message} onRetry={() => setAttempt((n) => n + 1)} actions={errorActions} />;
  }

  return <>{children(state.value)}</>;
}

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
  /** A smaller inline version for use inside other sections. */
  compact?: boolean;
  /** Extra buttons shown after "Try again". */
  actions?: ReactNode;
}

export function ErrorView({ message, onRetry, compact = false, actions }: ErrorViewProps) {
  return (
    <div
      role="alert"
      className={
        compact
          ? "flex flex-wrap items-center justify-between gap-3 border-2 border-ink px-4 py-3"
          : "pt-3 flex flex-col items-start gap-5"
      }
    >
      <p className={compact ? "font-semibold" : "max-w-[52ch] text-lg font-semibold"}>{message}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onRetry} className={compact ? "btn-secondary" : "btn-primary"}>
          Try again
        </button>
        {actions}
      </div>
    </div>
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong.";
}
