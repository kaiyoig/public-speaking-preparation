"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type AsyncState<T> =
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "done"; value: T };

interface AsyncViewProps<T> {
  /** The promise-returning call. It runs on mount and again on each "Try again". */
  run: () => Promise<T>;
  /** Shown above the loading bar while the call is pending. */
  label: string;
  /** Extra buttons shown beside "Try again" when the call fails. */
  errorActions?: ReactNode;
  children: (value: T) => ReactNode;
}

/** Wraps an async call with a loading view and an error-with-retry view. */
export function AsyncView<T>({ run, label, errorActions, children }: AsyncViewProps<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: "pending" });
  const [attempt, setAttempt] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    let canceled = false;
    setState({ status: "pending" });
    runRef.current().then(
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

  if (state.status === "pending") return <LoadingView label={label} />;

  if (state.status === "error") {
    return <ErrorView message={state.message} onRetry={() => setAttempt((n) => n + 1)} actions={errorActions} />;
  }

  return <>{children(state.value)}</>;
}

export function LoadingView({ label }: { label: string }) {
  return (
    <div role="status" className="rule-top flex flex-col gap-4">
      <span className="text-lg">{label}</span>
      <span aria-hidden className="relative block h-1 w-full max-w-md overflow-hidden bg-field">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-indeterminate bg-ink motion-reduce:animate-none" />
      </span>
    </div>
  );
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
          : "rule-top flex flex-col items-start gap-5"
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
