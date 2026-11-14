"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { Delivery } from "@/components/Delivery";
import { PhaseSteps } from "@/components/PhaseSteps";
import { QandA } from "@/components/QandA";
import { SpeechBriefForm } from "@/components/SpeechBriefForm";
import type { Recording, SpeechBrief } from "@/domain/types";

type State =
  | { phase: "setup"; brief?: SpeechBrief }
  | { phase: "delivery"; brief: SpeechBrief }
  | { phase: "qa"; brief: SpeechBrief; delivery: Recording }
  | { phase: "reflection"; brief: SpeechBrief; delivery: Recording; answers: Recording[] };

type Action =
  | { type: "briefSubmitted"; brief: SpeechBrief }
  | { type: "deliveryFinished"; delivery: Recording }
  | { type: "qandaFinished"; answers: Recording[] }
  | { type: "practiseAgain" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "briefSubmitted":
      return state.phase === "setup" ? { phase: "delivery", brief: action.brief } : state;
    case "deliveryFinished":
      return state.phase === "delivery" ? { phase: "qa", brief: state.brief, delivery: action.delivery } : state;
    case "qandaFinished":
      return state.phase === "qa"
        ? { phase: "reflection", brief: state.brief, delivery: state.delivery, answers: action.answers }
        : state;
    case "practiseAgain":
      return state.phase === "reflection" ? { phase: "setup", brief: state.brief } : state;
  }
}

const PHASES = [
  { id: "setup", label: "Setup" },
  { id: "delivery", label: "Delivery" },
  { id: "qa", label: "Q&A" },
  { id: "reflection", label: "Reflection" },
] as const;

/** A Normal Mode Session. Sessions are not saved: refreshing restarts it. */
export default function NormalModePage() {
  const [state, dispatch] = useReducer(reducer, { phase: "setup" });
  const router = useRouter();
  const quit = () => router.push("/");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Normal Mode</h1>
        <PhaseSteps phases={PHASES} current={state.phase} />
      </header>

      {state.phase === "setup" && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <SpeechBriefForm initial={state.brief} onSubmit={(brief) => dispatch({ type: "briefSubmitted", brief })} />
          <Link href="/" className="self-start text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            ← Back to Home
          </Link>
        </div>
      )}

      {state.phase === "delivery" && (
        <Delivery
          mode="normal"
          timeLimitSeconds={state.brief.timeLimitMinutes * 60}
          onFinished={(delivery) => dispatch({ type: "deliveryFinished", delivery })}
          onQuit={quit}
        />
      )}

      {state.phase === "qa" && (
        <QandA
          brief={state.brief}
          delivery={state.delivery}
          onFinished={(answers) => dispatch({ type: "qandaFinished", answers })}
          onQuit={quit}
        />
      )}

      {state.phase === "reflection" && (
        <Placeholder label="Reflection — coming in ticket 07" onAdvance={() => dispatch({ type: "practiseAgain" })} />
      )}
    </div>
  );
}

function Placeholder({ label, onAdvance }: { label: string; onAdvance: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-10">
      <p className="text-neutral-600 dark:text-neutral-400">{label}</p>
      <button type="button" onClick={onAdvance} className="btn-primary">
        Next
      </button>
    </div>
  );
}
