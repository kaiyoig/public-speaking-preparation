"use client";

import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { Delivery } from "@/components/Delivery";
import { PhaseSteps } from "@/components/PhaseSteps";
import { SessionRail, Shell } from "@/components/Shell";
import { Reflection } from "@/components/Reflection";
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
  | { type: "practiceAgain" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "started":
      return state.phase === "setup" ? { phase: "delivery", topicBriefing: action.topicBriefing } : state;
    case "deliveryFinished":
      return state.phase === "delivery"
        ? { phase: "reflection", topicBriefing: state.topicBriefing, delivery: action.delivery }
        : state;
    case "practiceAgain":
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
    <Shell
      wordmarkLinksHome={state.phase !== "delivery"}
      rail={
        <SessionRail mode="Improv Mode">
          <PhaseSteps phases={PHASES} current={state.phase} />
        </SessionRail>
      }
    >
      {state.phase === "setup" && (
        <TopicBriefingView onStart={(topicBriefing) => dispatch({ type: "started", topicBriefing })} />
      )}

      {state.phase === "delivery" && (
        <Delivery
          mode="improv"
          timeLimitSeconds={IMPROV_TIME_LIMIT_SECONDS}
          sidePanel={
            <section aria-label="Topic Briefing" className="rule-top">
              <h2 className="text-2xl font-bold leading-tight tracking-tight font-display">
                <span className="bg-highlight box-decoration-clone px-[0.15em] text-on-highlight">
                  {state.topicBriefing.topic}
                </span>
              </h2>
              <h3 className="mt-5 font-bold">Speaking Points</h3>
              <SpeakingPointsList speakingPoints={state.topicBriefing.speakingPoints} className="mt-2" />
            </section>
          }
          onFinished={(delivery) => dispatch({ type: "deliveryFinished", delivery })}
          onQuit={quit}
        />
      )}

      {state.phase === "reflection" && (
        <Reflection
          input={{ mode: "improv", topicBriefing: state.topicBriefing, delivery: state.delivery }}
          onPracticeAgain={() => dispatch({ type: "practiceAgain" })}
        />
      )}
    </Shell>
  );
}
