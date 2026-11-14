import Link from "next/link";

const MODES = [
  {
    href: "/normal",
    title: "Normal Mode",
    description:
      "Practise a speech you prepared. Describe it in a Speech Brief, deliver it, then answer the Host's Questions.",
    phases: "Setup · Delivery · Q&A · Reflection",
  },
  {
    href: "/improv",
    title: "Improv Mode",
    description:
      "Speak for 2 minutes on a random topic. You get a Topic Briefing with Speaking Points to draw on.",
    phases: "Setup · Delivery · Reflection",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col gap-12 py-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Public Speaking Preparation</h1>
        <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
          Rehearse in front of an AI Host that listens, watches, asks Questions and gives you a spoken Reflection.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="card group flex flex-col gap-3 p-8 transition-colors hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:border-indigo-500"
          >
            <h2 className="text-2xl font-semibold">{mode.title}</h2>
            <p className="text-neutral-600 dark:text-neutral-400">{mode.description}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">{mode.phases}</p>
            <span className="mt-auto pt-4 font-medium text-indigo-600 group-hover:underline dark:text-indigo-400">
              Start {mode.title} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
