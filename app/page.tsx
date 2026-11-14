import Link from "next/link";
import { Shell } from "@/components/Shell";

const MODES = [
  {
    href: "/normal",
    title: "Normal Mode",
    description:
      "Practise a speech you prepared. Describe it in a Speech Brief, deliver it, then answer the Host's Questions.",
    phases: ["Setup", "Delivery", "Q&A", "Reflection"],
  },
  {
    href: "/improv",
    title: "Improv Mode",
    description:
      "Speak for 2 minutes on a random topic. You get a Topic Briefing with Speaking Points to draw on.",
    phases: ["Setup", "Delivery", "Reflection"],
  },
] as const;

export default function Home() {
  return (
    <Shell
      rail={
        <p className="max-w-xs text-lg leading-snug">
          Rehearse in front of an AI Host that listens, watches, asks Questions and gives you a spoken Reflection.
        </p>
      }
    >
      <h1 className="sr-only">Public Speaking Preparation</h1>
      <nav aria-label="Modes">
        <ul>
          {MODES.map((mode) => (
            <li
              key={mode.href}
              className="grid gap-x-8 gap-y-6 border-t-2 border-ink pt-4 pb-14 lg:grid-cols-9 lg:pb-20"
            >
              <Link
                href={mode.href}
                className="col-span-full text-[clamp(3.5rem,10.5vw,10rem)] font-black leading-[0.85] tracking-[-0.025em] font-stretch-condensed decoration-[0.07em] underline-offset-[0.1em] hover:underline"
              >
                {mode.title}
              </Link>
              <p className="max-w-[52ch] text-lg leading-relaxed lg:col-span-5">{mode.description}</p>
              <ol aria-label={`${mode.title} Phases`} className="text-lg lg:col-span-3 lg:col-start-7">
                {mode.phases.map((phase, index) => (
                  <li key={phase} className="flex items-baseline gap-2.5">
                    <span className="w-3 tabular-nums">{index + 1}</span>
                    <span>{phase}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </nav>
    </Shell>
  );
}
