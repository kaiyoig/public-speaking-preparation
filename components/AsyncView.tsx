"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type AsyncState<T> =
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "done"; value: T };

interface AsyncViewProps<T> {
  /** The promise-returning call. It runs on mount and again on each "Try again". */
  run: () => Promise<T>;
  /** Shown next to the spinner while the call is pending. */
  label: string;
  children: (value: T) => ReactNode;
}

/** Wraps an async call with a loading view and an error-with-retry view. */
export function AsyncView<T>({ run, label, children }: AsyncViewProps<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: "pending" });
  const [attempt, setAttempt] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "pending" });
    runRef.current().then(
      (value) => {
        if (!cancelled) setState({ status: "done", value });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Something went wrong.",
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === "pending") return <LoadingView label={label} />;

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900"
      >
        <p className="text-neutral-700 dark:text-neutral-300">{state.message}</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-primary">
          Try again
        </button>
      </div>
    );
  }

  return <>{children(state.value)}</>;
}

export function LoadingView({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-10 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
    >
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600 dark:border-neutral-700 dark:border-t-indigo-400"
      />
      <span>{label}</span>
    </div>
  );
}
