"use client";

import { useRouter } from "next/navigation";
import { useReducer, ViewTransition } from "react";
import { Delivery } from "@/components/Delivery";
import { PageTransition } from "@/components/PageTransition";
import { PhaseSteps } from "@/components/PhaseSteps";
import { SessionRail, Shell } from "@/components/Shell";
import { changePhase, PHASE_MOTION, TRANSITION } from "@/components/transitions";
import { Reflection } from "@/components/Reflection";
import { SpeakingPointsList, TopicBriefingView } from "@/components/TopicBriefingView";
import { TopicKindPicker } from "@/components/TopicKindPicker";
import { IMPROV_TIME_LIMIT_SECONDS } from "@/domain/config";
import type { Recording, TopicBriefing, TopicKind } from "@/domain/types";

type State =
  | { phase: "setup" }
  | { phase: "briefing"; kind: TopicKind }
  | { phase: "delivery"; topicBriefing: TopicBriefing }
  | { phase: "reflection"; topicBriefing: TopicBriefing; delivery: Recording };

type Action =
  | { type: "kindChosen"; kind: TopicKind }
  | { type: "changeKind" }
  | { type: "started"; topicBriefing: TopicBriefing }
  | { type: "deliveryFinished"; delivery: Recording }
  | { type: "practiceAgain" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "kindChosen":
      return state.phase === "setup" ? { phase: "briefing", kind: action.kind } : state;
    case "changeKind":
      return state.phase === "briefing" ? { phase: "setup" } : state;
    case "started":
      return state.phase === "briefing" ? { phase: "delivery", topicBriefing: action.topicBriefing } : state;
    case "deliveryFinished":
      return state.phase === "delivery"
        ? { phase: "reflection", topicBriefing: state.topicBriefing, delivery: action.delivery }
        : state;
    case "practiceAgain":
      // Back to choosing a Topic Kind; Briefing fetches a fresh Topic Briefing once one is chosen.
      return state.phase === "reflection" ? { phase: "setup" } : state;
  }
}

const PHASES = [
  { id: "setup", label: "Setup" },
  { id: "briefing", label: "Briefing" },
  { id: "delivery", label: "Delivery" },
  { id: "reflection", label: "Reflection" },
] as const;

/** An Improv Mode Session. Sessions are not saved: refreshing restarts it. */
export default function ImprovModePage() {
  const [state, dispatch] = useReducer(reducer, { phase: "setup" });
  const router = useRouter();
  const quit = () => router.push("/", { transitionTypes: [TRANSITION.leaveSession] });
  const forward = (action: Action) => changePhase("forward", () => dispatch(action));

  return (
    <PageTransition>
      <Shell
        wordmarkLinksHome={state.phase !== "delivery"}
        dense={state.phase === "delivery"}
        rail={
          <SessionRail mode="Improv Mode">
            <PhaseSteps phases={PHASES} current={state.phase} />
          </SessionRail>
        }
      >
        {/* Keyed by Phase, so each Phase change is one leaving and one arriving. */}
        <ViewTransition key={state.phase} enter={PHASE_MOTION} exit={PHASE_MOTION} default="none">
          {state.phase === "setup" && (
            <TopicKindPicker onChoose={(kind) => forward({ type: "kindChosen", kind })} />
          )}

          {state.phase === "briefing" && (
            <TopicBriefingView
              kind={state.kind}
              onStart={(topicBriefing) => forward({ type: "started", topicBriefing })}
              onChangeKind={() => changePhase("back", () => dispatch({ type: "changeKind" }))}
            />
          )}

          {state.phase === "delivery" && (
            <Delivery
              mode="improv"
              timeLimitSeconds={IMPROV_TIME_LIMIT_SECONDS}
              sidePanel={
                <section aria-label="Topic Briefing" className="pt-3">
                  <h2 className="text-2xl font-bold leading-tight tracking-tight font-display">
                    {state.topicBriefing.topic}
                  </h2>
                  <h3 className="mt-5 font-bold">Speaking Points</h3>
                  <SpeakingPointsList speakingPoints={state.topicBriefing.speakingPoints} className="mt-2" />
                </section>
              }
              onFinished={(delivery) => forward({ type: "deliveryFinished", delivery })}
              onQuit={quit}
            />
          )}

          {state.phase === "reflection" && (
            <Reflection
              input={{ mode: "improv", topicBriefing: state.topicBriefing, delivery: state.delivery }}
              onPracticeAgain={() => changePhase("back", () => dispatch({ type: "practiceAgain" }))}
            />
          )}
        </ViewTransition>
      </Shell>
    </PageTransition>
  );
}
