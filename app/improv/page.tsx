"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { Delivery } from "@/components/Delivery";
import { PhaseSteps } from "@/components/PhaseSteps";
import { SpeakingPointsList, TopicBriefingView } from "@/components/TopicBriefingView";
import { IMPROV_TIME_LIMIT_SECONDS } from "@/domain/config";
import type { Recording, TopicBriefing } from "@/domain/types";

type State =
  | { phase: "setup" }
  | { phase: "delivery"; topicBriefing: TopicBriefing }
  | { phase: "reflection"; topicBriefing: TopicBriefing; delivery: Recording };

type Action =
  | { type: "started"; topicBriefing: TopicBriefing }
  | { type: "deliveryFinished"; delivery: Recording }
  | { type: "practiseAgain" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "started":
      return state.phase === "setup" ? { phase: "delivery", topicBriefing: action.topicBriefing } : state;
    case "deliveryFinished":
      return state.phase === "delivery"
        ? { phase: "reflection", topicBriefing: state.topicBriefing, delivery: action.delivery }
        : state;
    case "practiseAgain":
      // Setup fetches a fresh Topic Briefing when it mounts.
      return state.phase === "reflection" ? { phase: "setup" } : state;
  }
}

const PHASES = [
  { id: "setup", label: "Setup" },
  { id: "delivery", label: "Delivery" },
  { id: "reflection", label: "Reflection" },
] as const;

/** An Improv Mode Session. Sessions are not saved: refreshing restarts it. */
export default function ImprovModePage() {
  const [state, dispatch] = useReducer(reducer, { phase: "setup" });
  const router = useRouter();
  const quit = () => router.push("/");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Improv Mode</h1>
        <PhaseSteps phases={PHASES} current={state.phase} />
      </header>

      {state.phase === "setup" && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <TopicBriefingView onStart={(topicBriefing) => dispatch({ type: "started", topicBriefing })} />
          <Link href="/" className="self-start text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            ← Back to Home
          </Link>
        </div>
      )}

      {state.phase === "delivery" && (
        <Delivery
          mode="improv"
          timeLimitSeconds={IMPROV_TIME_LIMIT_SECONDS}
          sidePanel={
            <section aria-label="Topic Briefing" className="card">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Topic</p>
              <h2 className="mt-1 text-lg font-semibold">{state.topicBriefing.topic}</h2>
              <h3 className="mt-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Speaking Points</h3>
              <SpeakingPointsList speakingPoints={state.topicBriefing.speakingPoints} className="mt-2 text-sm" />
            </section>
          }
          onFinished={(delivery) => dispatch({ type: "deliveryFinished", delivery })}
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
