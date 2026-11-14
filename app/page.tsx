import Link from "next/link";
import { HomePager } from "@/components/HomePager";
import { Shell } from "@/components/Shell";
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
    description: "Practise a speech you’ve prepared, then take questions on it.",
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
  return <HomePager about={<About />} modes={<Modes />} />;
}

/**
 * The top panel: the name at poster size, then what the app is and what the Host does.
 * Its lower half sits on the same 3 + 9 columns as the Modes panel beneath it.
 */
function About() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-4 pt-5 pb-6 sm:px-6 lg:px-10 lg:pt-9 lg:pb-10">
      <h1 className="pb-8 text-[clamp(3.75rem,min(17vw,19vh),17rem)] font-black leading-[0.85] tracking-[-0.025em] font-stretch-condensed">
        Public
        <br />
        Speaking
        <br />
        Preparation
      </h1>

      <div className="mt-auto grid grid-cols-4 gap-x-6 gap-y-8 border-t-2 border-ink pt-4 lg:grid-cols-12 lg:gap-x-8">
        <p className="col-span-4 max-w-[30ch] text-2xl leading-[1.2] font-medium lg:col-span-3">
          A practice room for speeches. Bring one you’ve prepared, or improvise on a random topic, and give it to an
          AI host.
        </p>
        <ul className="col-span-4 grid grid-cols-2 gap-x-6 gap-y-5 text-lg leading-snug sm:grid-cols-4 lg:col-span-9 lg:gap-x-8">
          {HOST_ROLES.map((role) => (
            <li key={role.title}>
              <p className="font-bold">{role.title}</p>
              <p className="text-mute">{role.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <a
        href="#modes"
        className="group mt-10 flex items-center gap-4 self-start text-2xl font-bold outline-offset-4"
      >
        <Arrow className="size-12 rotate-90 p-2.5 sm:size-14 sm:p-3" />
        Choose a mode
      </a>
    </div>
  );
}

/** The bottom panel: the two Modes to choose between. */
function Modes() {
  return (
    <Shell
      rail={
        <a href="#about" className="text-lg font-semibold underline underline-offset-4 hover:text-mute">
          About this app
        </a>
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
        <h2 className="text-[clamp(3.5rem,min(10.5vw,19vh),10rem)] font-black leading-[0.85] tracking-[-0.025em] font-stretch-condensed">
          <Link href={mode.href} className="outline-none after:absolute after:inset-0 after:z-10">
            {mode.title}
          </Link>
        </h2>
        <Arrow className="mt-[0.06em] size-[clamp(2.75rem,min(7.5vw,13.5vh),7rem)] p-[0.4rem] sm:p-3" />
      </div>

      <p className="mt-5 max-w-[34ch] text-2xl leading-[1.2] font-medium sm:text-[1.625rem]">{mode.description}</p>

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
