import Link from "next/link";
import { HomePager } from "@/components/HomePager";
import { Shell } from "@/components/Shell";
import { SpeechBackdrop } from "@/components/SpeechBackdrop";
import { TypedName } from "@/components/TypedName";
import { Wordmark } from "@/components/Wordmark";
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

/** What the Host does during a Session, in the order the Speaker meets it. */
const HOST_ROLES = [
  { title: "It listens", detail: "To every word, from your opening line to your last." },
  { title: "It watches", detail: "How you stand, move and gesture while you speak." },
  { title: "It asks questions", detail: "About what you said, the way an audience would." },
  { title: "It gives feedback", detail: "Out loud, on what to improve next time." },
];

export default function Home() {
  return <HomePager title={<Title />} about={<About />} modes={<Modes />} />;
}

/**
 * The top panel: the name, centered, with one line on what the app is.
 * Behind both, famous speeches type themselves out.
 */
function Title() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-clip px-6 text-center">
      <SpeechBackdrop />
      <h1 className="relative text-[clamp(3.5rem,min(17vw,26vh),13rem)] font-bold leading-[0.8] tracking-[-0.045em] font-display">
        <TypedName />
      </h1>
    </div>
  );
}

/**
 * The middle panel: what the app is in the rail, and the Host's four roles two by two
 * in the content field. It sits on the same 3 + 9 columns as the Modes panel beneath it.
 */
function About() {
  return (
    <div className="mx-auto grid min-h-full w-full max-w-[1280px] grid-cols-4 gap-x-6 px-6 max-lg:grid-rows-[auto_auto_1fr_auto] sm:px-12 lg:grid-cols-12 lg:gap-x-8 lg:px-24">
      {/* On small screens the rail dissolves into the page, so the link can drop below the roles. */}
      <div className="max-lg:contents lg:col-span-3 lg:flex lg:flex-col lg:py-20">
        <a
          href="#top"
          className="col-span-4 block self-start pt-5 text-[1.75rem] font-bold leading-[0.92] tracking-tight font-display hover:text-mute lg:pt-0"
        >
          <Wordmark />
        </a>
        <h1 className="sr-only">About Rhetor</h1>
        <p className="col-span-4 mt-6 max-w-[30ch] text-xl leading-[1.25] font-medium lg:mt-14">
          A practice room for speeches. Bring one you’ve prepared, or improvise on a random topic, and give it to an
          AI host.
        </p>
        <a
          href="#modes"
          className="group col-span-4 flex items-center gap-4 self-start pb-6 text-xl font-bold outline-offset-4 max-lg:order-last lg:mt-auto lg:pb-0"
        >
          <Arrow className="size-10 rotate-90 p-2 sm:size-11 sm:p-2.5" />
          Choose a mode
        </a>
      </div>

      <ul className="col-span-4 grid auto-rows-fr grid-cols-2 gap-x-6 py-8 lg:col-span-9 lg:gap-x-8 lg:py-20">
        {HOST_ROLES.map((role) => (
          <li key={role.title} className="border-t-2 border-ink pt-4 pb-10 lg:pb-12">
            <h2 className="text-[clamp(1.5rem,min(2.6vw,5.5vh),2.75rem)] font-bold leading-[0.95] tracking-[-0.035em] font-display">
              {role.title}
            </h2>
            <p className="mt-3 max-w-[28ch] text-base leading-snug text-mute sm:text-lg">
              {role.detail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The bottom panel: the two Modes to choose between. */
function Modes() {
  return (
    <Shell>
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
          <Link href={mode.href} className="outline-none after:absolute after:inset-0 after:z-10">
            {mode.title}
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

/**
 * The highlighted arrow that marks where to go. Drawn rather than typed so its stroke
 * can match the headline's weight. The caller sets its size, padding and direction.
 */
function Arrow({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.25"
      strokeLinecap="square"
      className={`pointer-events-none shrink-0 overflow-visible bg-highlight text-on-highlight ${className}`}
    >
      <path
        d="M2 12h18M13.2 3.5l8.5 8.5-8.5 8.5"
        className="group-hover:translate-x-[1.5px] motion-safe:transition-transform motion-safe:duration-150"
      />
    </svg>
  );
}
