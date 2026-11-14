"use client";

import Link from "next/link";
import { AsyncView } from "@/components/AsyncView";
import { Host, useHost } from "@/components/Host";
import type { Reflection as ReflectionData, ReflectionSection } from "@/domain/types";
import { services, type ReflectionInput } from "@/services";

interface ReflectionProps {
  input: ReflectionInput;
  onPractiseAgain: () => void;
}

/** The Reflection Phase, shared by both Modes: what the Speaker can improve. No numeric scores. */
export function Reflection({ input, onPractiseAgain }: ReflectionProps) {
  return (
    <AsyncView run={() => services.hostBrain.getReflection(input)} label="The host is writing your reflection…">
      {(reflection) => <ReflectionView reflection={reflection} onPractiseAgain={onPractiseAgain} />}
    </AsyncView>
  );
}

const SECTIONS = [
  { key: "bodyLanguage", title: "Body Language" },
  { key: "voiceAndDelivery", title: "Voice & Delivery" },
  { key: "content", title: "Content" },
] as const;

function ReflectionView({ reflection, onPractiseAgain }: { reflection: ReflectionData; onPractiseAgain: () => void }) {
  const { caption, isSpeaking, say } = useHost();

  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-8 lg:grid-cols-9">
        <section aria-labelledby="reflection-summary" className="rule-top lg:col-span-6">
          <h2 id="reflection-summary" className="text-lg font-bold">
            Reflection
          </h2>
          <p className="mt-4 max-w-[38ch] text-2xl leading-snug sm:text-3xl sm:leading-tight">{reflection.summary}</p>
        </section>
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Host caption={caption} isSpeaking={isSpeaking} placeholder='Press "Play reflection" to hear it.' />
          <button
            type="button"
            onClick={() => void say(reflection.summary).catch(() => {})}
            disabled={isSpeaking}
            className="btn-secondary self-start"
          >
            {isSpeaking ? "Playing…" : "Play reflection"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <ReflectionSectionRow key={section.key} title={section.title} section={reflection[section.key]} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onPractiseAgain} className="btn-primary">
          Practise again
        </button>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}

/** One Reflection section: its title hanging left, Strengths and Improvements side by side. */
function ReflectionSectionRow({ title, section }: { title: string; section: ReflectionSection }) {
  return (
    <section aria-label={title} className="rule-top hang-row">
      <h3 className="text-3xl font-extrabold leading-[0.95] tracking-tight font-stretch-condensed lg:col-span-2">
        {title}
      </h3>
      <div className="hang-body mt-2 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:mt-0">
        <ReflectionList title="Strengths" items={section.strengths} />
        <ReflectionList title="Improvements" items={section.improvements} />
      </div>
    </section>
  );
}

function ReflectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-bold">{title}</h4>
      <ul className="mt-2 flex flex-col gap-2.5 text-lg leading-snug">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
