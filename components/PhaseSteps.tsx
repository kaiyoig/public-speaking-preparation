interface PhaseStepsProps<P extends string> {
  phases: readonly { id: P; label: string }[];
  current: P;
}

/** Shows where the Session is: each Phase numbered in order, the current one set bold. */
export function PhaseSteps<P extends string>({ phases, current }: PhaseStepsProps<P>) {
  const currentIndex = phases.findIndex((phase) => phase.id === current);
  return (
    <ol aria-label="Phases" className="flex flex-wrap gap-x-5 gap-y-1 text-lg lg:flex-col lg:gap-y-1.5">
      {phases.map((phase, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={phase.id}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex items-baseline gap-2.5 ${
              state === "current" ? "font-bold text-ink" : state === "done" ? "text-ink" : "text-mute"
            }`}
          >
            <span className="w-3 tabular-nums">{index + 1}</span>
            <span>{phase.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
