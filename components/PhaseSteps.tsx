interface PhaseStepsProps<P extends string> {
  phases: readonly { id: P; label: string }[];
  current: P;
}

/** Shows where the Session is: each Phase in order, with the current one highlighted. */
export function PhaseSteps<P extends string>({ phases, current }: PhaseStepsProps<P>) {
  const currentIndex = phases.findIndex((phase) => phase.id === current);
  return (
    <ol aria-label="Phases" className="flex flex-wrap items-center gap-2 text-sm">
      {phases.map((phase, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li key={phase.id} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden className="h-px w-6 bg-neutral-300 dark:bg-neutral-700" />}
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={
                state === "current"
                  ? "rounded-full bg-indigo-600 px-3 py-1 font-medium text-white dark:bg-indigo-500"
                  : state === "done"
                    ? "rounded-full px-3 py-1 text-neutral-700 dark:text-neutral-300"
                    : "rounded-full px-3 py-1 text-neutral-400 dark:text-neutral-600"
              }
            >
              {phase.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
