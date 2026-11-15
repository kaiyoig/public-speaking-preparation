import Link from "next/link";
import { Arrow } from "@/components/Arrow";
import { HomePager } from "@/components/HomePager";
import { ModeTitle } from "@/components/ModeTitle";
import { PageTransition } from "@/components/PageTransition";
import { Shell } from "@/components/Shell";
import { SpeechBackdrop } from "@/components/SpeechBackdrop";
import { TRANSITION } from "@/components/transitions";
import { TypedName } from "@/components/TypedName";
import { IMPROV_TIME_LIMIT_SECONDS, QUESTION_COUNT } from "@/domain/config";

/**
 * Both Modes are laid out on the same four Phase columns, so what sets them
 * apart reads straight across: Improv Mode's Q&A column is simply empty.
 */
const PHASE_COLUMNS = ["Setup", "Delivery", "Q&A", "Reflection"] as const;

type PhaseName = (typeof PHASE_COLUMNS)[number];

interface Mode {
  href: string;
  title: string;
  description: string;
  /** What each Phase involves in this Mode. A Phase left out is one the Mode skips. */
  phases: Partial<Record<PhaseName, string>>;
}

const MODES: Mode[] = [
  {
    href: "/normal",
    title: "Normal Mode",
    description: "Practice a speech you’ve prepared, then take questions on it.",
    phases: {
      Setup: "Describe your speech",
      Delivery: "You set the time limit",
      "Q&A": `${QUESTION_COUNT} questions from the host`,
      Reflection: "Spoken feedback",
    },
  },
  {
    href: "/improv",
    title: "Improv Mode",
    description: "Speak off the cuff on a random topic, with a few facts to draw on.",
    phases: {
      Setup: "Get a random topic",
      Delivery: `${IMPROV_TIME_LIMIT_SECONDS / 60} minutes`,
      Reflection: "Spoken feedback",
    },
  },
];

export default function Home() {
  return (
    <PageTransition>
      <HomePager title={<Title />} modes={<Modes />} />
    </PageTransition>
  );
}

/**
 * The top panel: the name, centered, with famous speeches typing themselves out behind it.
 * About is linked from the top corner, and the arrow at the foot shows the Modes are below.
 */
function Title() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-clip px-6 text-center">
      <SpeechBackdrop />
      <h1 className="relative text-[clamp(3.5rem,min(17vw,26vh),13rem)] font-bold leading-[0.8] tracking-[-0.045em] font-display">
        <TypedName />
      </h1>
      <Link
        href="/about"
        transitionTypes={[TRANSITION.toAbout]}
        className="text-link absolute top-5 right-6 bg-paper text-lg sm:top-9 sm:right-12 lg:right-24"
      >
        About Rhetor
      </Link>
      <a
        href="#modes"
        className="group absolute right-6 bottom-4 flex items-center gap-4 bg-paper pl-3 text-xl font-bold outline-offset-4 sm:right-12 lg:right-24"
      >
        <span className="max-md:sr-only">Choose a mode</span>
        <span className="motion-safe:animate-nudge">
          <Arrow className="size-10 rotate-90 p-2 sm:size-11 sm:p-2.5" />
        </span>
      </a>
    </div>
  );
}

/** The bottom panel: the two Modes to choose between, with About linked from the rail. */
function Modes() {
  return (
    <Shell
      rail={
        <Link href="/about" transitionTypes={[TRANSITION.toAbout]} className="text-link self-start text-lg">
          About Rhetor
        </Link>
      }
    >
      <h1 className="sr-only">Choose a mode</h1>
      <nav aria-label="Modes" className="flex grow flex-col">
        <ul className="grid grow auto-rows-fr">
          {MODES.map((mode) => (
            <ModeEntry key={mode.href} mode={mode} />
          ))}
        </ul>
      </nav>
    </Shell>
  );
}

/** One Mode. The whole entry is the link; the highlighted arrow says so before any hover. */
function ModeEntry({ mode }: { mode: Mode }) {
  const included = PHASE_COLUMNS.filter((phase) => mode.phases[phase]);

  return (
    <li className="group relative flex flex-col border-t-2 border-ink pt-4 pb-10 outline-offset-4 outline-ink has-[a:focus-visible]:outline-2 lg:pb-12">
      <div className="flex items-start justify-between gap-6">
        <h2 className="text-[clamp(2rem,min(5vw,10vh),5rem)] font-bold leading-[0.9] tracking-[-0.04em] font-display">
          <Link
            href={mode.href}
            transitionTypes={[TRANSITION.enterSession]}
            className="outline-none after:absolute after:inset-0 after:z-10"
          >
            <ModeTitle>{mode.title}</ModeTitle>
          </Link>
        </h2>
        <Arrow className="mt-[0.06em] size-[clamp(2.25rem,min(4.2vw,8.5vh),4.25rem)] p-[0.4rem] sm:p-2.5" />
      </div>

      <p className="mt-4 max-w-[36ch] text-xl leading-[1.25] font-medium">{mode.description}</p>

      <ol
        aria-label={`${mode.title} Phases`}
        className="mt-auto grid grid-cols-2 gap-x-6 gap-y-5 pt-10 sm:grid-cols-4 lg:gap-x-8"
      >
        {PHASE_COLUMNS.map((phase) => {
          const detail = mode.phases[phase];
          if (!detail) {
            // Hold the column open so the Phases after it stay aligned with the other Mode.
            return <li key={phase} aria-hidden="true" className="hidden sm:block" />;
          }
          return (
            <li key={phase} className="border-t border-mute pt-2.5 text-lg leading-snug">
              <p className="flex items-baseline gap-2.5 font-bold">
                <span className="tabular-nums">{included.indexOf(phase) + 1}</span>
                <span>{phase}</span>
              </p>
              <p className="text-mute">{detail}</p>
            </li>
          );
        })}
      </ol>
    </li>
  );
}
