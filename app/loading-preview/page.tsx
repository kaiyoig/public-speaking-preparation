import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordShell } from "@/components/RecordShell";
import { LoadingPreviewHold } from "./LoadingPreviewHold";

/** The labels the app loads under, so each can be checked at its real length. */
const LABELS: [string, ...string[]] = [
  "Opening your reflection…",
  "The host is preparing questions…",
  "The host is writing your reflection…",
  "Researching a fresh topic…",
  "Searching the news for a trending topic…",
];

/**
 * A development-only page that holds the loading screen until a key or click lets it go, to
 * watch it come in, hold and play out. Pick a label from the list, or pass your own as
 * `?label=`. In production it is not found.
 */
export default async function LoadingPreview({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { label = LABELS[0] } = await searchParams;

  return (
    <RecordShell>
      <div className="flex flex-col gap-16">
        <LoadingPreviewHold key={label} label={label} />
        <ul className="flex flex-col gap-2 text-lg">
          {LABELS.map((option) => (
            <li key={option}>
              <Link
                href={{ query: { label: option } }}
                aria-current={option === label ? "page" : undefined}
                className="text-link aria-[current=page]:bg-highlight aria-[current=page]:text-on-highlight"
              >
                {option}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </RecordShell>
  );
}
