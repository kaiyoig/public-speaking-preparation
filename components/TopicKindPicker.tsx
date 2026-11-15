import { Arrow } from "@/components/Arrow";
import type { TopicKind } from "@/domain/types";

const TOPIC_KINDS: readonly { kind: TopicKind; title: string; description: string }[] = [
  {
    kind: "classic",
    title: "Classic",
    description: "A timeless debate question, like whether college should be free.",
  },
  {
    kind: "trending",
    title: "Trending",
    description: "A fresh question written from this week’s news headlines.",
  },
];

interface TopicKindPickerProps {
  onChoose: (kind: TopicKind) => void;
}

/**
 * Improv Mode Setup: the Speaker picks where their topic comes from, before the Briefing Phase fetches it.
 * Each kind is one entry, set out like the Modes on Home: the whole entry is the button.
 */
export function TopicKindPicker({ onChoose }: TopicKindPickerProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold">Pick a kind of topic</h2>
      <ul className="flex flex-col">
        {TOPIC_KINDS.map(({ kind, title, description }) => (
          <li
            key={kind}
            className="group relative border-t-2 border-ink pt-4 pb-10 outline-offset-4 outline-ink has-[button:focus-visible]:outline-2"
          >
            <div className="flex items-start justify-between gap-6">
              <h3 className="text-5xl font-bold leading-[0.95] tracking-tight font-display sm:text-6xl">
                <button
                  type="button"
                  onClick={() => onChoose(kind)}
                  className="text-left outline-none after:absolute after:inset-0"
                >
                  {title}
                </button>
              </h3>
              <Arrow className="mt-1 size-11 p-2.5 sm:size-12" />
            </div>
            <p className="mt-4 max-w-[36ch] text-xl leading-[1.25] font-medium">{description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
