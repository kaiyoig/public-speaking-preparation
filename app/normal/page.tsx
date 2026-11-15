"use client";

import { useRouter } from "next/navigation";
import { useReducer, ViewTransition } from "react";
import { Delivery } from "@/components/Delivery";
import { MediaAccessGate } from "@/components/MediaAccessGate";
import { PageTransition } from "@/components/PageTransition";
import { PhaseSteps } from "@/components/PhaseSteps";
import { SessionRail, Shell } from "@/components/Shell";
import { changePhase, PHASE_MOTION, TRANSITION } from "@/components/transitions";
import { Reflection } from "@/components/Reflection";
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
  | { type: "practiceAgain" };

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
    case "practiceAgain":
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
  const quit = () => router.push("/", { transitionTypes: [TRANSITION.leaveSession] });
  const forward = (action: Action) => changePhase("forward", () => dispatch(action));

  return (
    <PageTransition>
      <Shell
        wordmarkLinksHome={!(state.phase === "delivery" || state.phase === "qa")}
        dense={state.phase === "delivery" || state.phase === "qa"}
        rail={
          <SessionRail mode="Normal Mode">
            <PhaseSteps phases={PHASES} current={state.phase} />
          </SessionRail>
        }
      >
        <MediaAccessGate>
          {/* Keyed by Phase, so each Phase change is one leaving and one arriving. */}
          <ViewTransition key={state.phase} enter={PHASE_MOTION} exit={PHASE_MOTION} default="none">
            {state.phase === "setup" && (
              <SpeechBriefForm initial={state.brief} onSubmit={(brief) => forward({ type: "briefSubmitted", brief })} />
            )}

            {state.phase === "delivery" && (
              <Delivery
                mode="normal"
                timeLimitSeconds={state.brief.timeLimitMinutes * 60}
                onFinished={(delivery) => forward({ type: "deliveryFinished", delivery })}
                onQuit={quit}
              />
            )}

            {state.phase === "qa" && (
              <QandA
                brief={state.brief}
                delivery={state.delivery}
                onFinished={(answers) => forward({ type: "qandaFinished", answers })}
                onQuit={quit}
              />
            )}

            {state.phase === "reflection" && (
              <Reflection
                input={{ mode: "normal", brief: state.brief, delivery: state.delivery, answers: state.answers }}
                onPracticeAgain={() => changePhase("back", () => dispatch({ type: "practiceAgain" }))}
              />
            )}
          </ViewTransition>
        </MediaAccessGate>
      </Shell>
    </PageTransition>
  );
}
