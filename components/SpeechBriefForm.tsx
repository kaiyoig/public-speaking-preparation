"use client";

import { useId, useState, type FormEvent } from "react";
import { researchBriefAction, type AudiencePrepResult } from "@/app/actions/hostBrain";
import type { Purpose, SpeechBrief } from "@/domain/types";

const PURPOSES: readonly { value: Purpose; label: string }[] = [
  { value: "inform", label: "Inform" },
  { value: "persuade", label: "Persuade" },
  { value: "entertain", label: "Entertain" },
  { value: "other", label: "Other" },
];

const MIN_MINUTES = 1;
const MAX_MINUTES = 30;

interface Fields {
  audience: string;
  purpose: Purpose | "";
  timeLimitMinutes: string;
  notes: string;
}

type Errors = Partial<Record<keyof Fields, string>>;

function validate(fields: Fields): { errors: Errors; brief?: SpeechBrief } {
  const errors: Errors = {};
  const audience = fields.audience.trim();
  if (!audience) errors.audience = "Describe who the speech is for.";

  if (!fields.purpose) errors.purpose = "Choose a purpose.";

  const minutes = Number(fields.timeLimitMinutes);
  if (!fields.timeLimitMinutes.trim()) {
    errors.timeLimitMinutes = "Enter a time limit.";
  } else if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
    errors.timeLimitMinutes = `Enter a whole number of minutes from ${MIN_MINUTES} to ${MAX_MINUTES}.`;
  }

  if (Object.keys(errors).length > 0 || !fields.purpose) return { errors };

  const notes = fields.notes.trim();
  const brief: SpeechBrief = { audience, purpose: fields.purpose, timeLimitMinutes: minutes };
  if (notes) brief.notes = notes;
  return { errors, brief };
}

function toFields(initial?: SpeechBrief): Fields {
  return {
    audience: initial?.audience ?? "",
    purpose: initial?.purpose ?? "",
    timeLimitMinutes: initial ? String(initial.timeLimitMinutes) : "5",
    notes: initial?.notes ?? "",
  };
}

interface SpeechBriefFormProps {
  /** Prefills the form, e.g. when the Speaker chooses "Practice again". */
  initial?: SpeechBrief | undefined;
  onSubmit: (brief: SpeechBrief) => void;
}

/** Normal Mode Setup: the Speaker describes their speech. */
export function SpeechBriefForm({ initial, onSubmit }: SpeechBriefFormProps) {
  const [fields, setFields] = useState<Fields>(() => toFields(initial));
  const [submitted, setSubmitted] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [prepResult, setPrepResult] = useState<AudiencePrepResult | null>(null);
  const id = useId();

  // Validate live only after the first submit attempt, so the form doesn't nag while empty.
  const { errors } = submitted ? validate(fields) : { errors: {} as Errors };

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const result = validate(fields);
    if (result.brief) onSubmit(result.brief);
  }

  async function handleResearchAudience() {
    if (!fields.audience.trim()) {
      setPrepError("Enter an Audience first so we know who to research.");
      return;
    }
    setPrepError(null);
    setPrepLoading(true);
    try {
      const result = await researchBriefAction(fields.audience, fields.purpose, fields.notes);
      if (!result) {
        setPrepError("Live web research is unavailable (check Bright Data & Gemini API keys in .env).");
      } else {
        setPrepResult(result);
      }
    } catch (err) {
      setPrepError(err instanceof Error ? err.message : "Failed to research audience.");
    } finally {
      setPrepLoading(false);
    }
  }

  function insertInsightsIntoNotes() {
    if (!prepResult) return;
    const bullets = prepResult.insights.map((item) => `- ${item}`).join("\n");
    const prefix = fields.notes.trim() ? `${fields.notes.trim()}\n\n` : "";
    update("notes", `${prefix}Audience & Evidence Prep:\n${bullets}`);
  }

  const fieldId = (key: keyof Fields) => `${id}-${key}`;
  const errorId = (key: keyof Fields) => `${id}-${key}-error`;
  // A single bottom rule; it thickens (without shifting layout) on focus and on error.
  const inputClass = (key: keyof Fields) =>
    `w-full border-0 border-b border-ink bg-transparent px-0 py-2 text-xl placeholder:text-mute focus:shadow-[0_2px_0_0_var(--color-ink)] focus-visible:outline-none ${
      errors[key] ? "shadow-[0_2px_0_0_var(--color-ink)]" : ""
    }`;
  const describedBy = (key: keyof Fields) => (errors[key] ? errorId(key) : undefined);
  const errorText = (key: keyof Fields) =>
    errors[key] ? (
      <p id={errorId(key)} className="mt-3 font-bold">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-10">
      <header className="rule-top">
        <h2 className="text-5xl font-bold leading-none tracking-tight font-display sm:text-6xl">
          Speech Brief
        </h2>
        <p className="mt-4 max-w-[52ch] text-lg">Tell the host about your speech so it can ask the right questions.</p>
      </header>

      <div className="flex flex-col gap-9">
        <div className="hang-row">
          <label htmlFor={fieldId("audience")} className="hang-label lg:pt-2">
            Audience
          </label>
          <div className="hang-body max-w-2xl">
            <input
              id={fieldId("audience")}
              type="text"
              value={fields.audience}
              onChange={(event) => update("audience", event.target.value)}
              placeholder="e.g. first-year university students"
              aria-invalid={Boolean(errors.audience)}
              aria-describedby={describedBy("audience")}
              className={inputClass("audience")}
            />
            {errorText("audience")}
          </div>
        </div>

        <fieldset className="hang-row" aria-describedby={describedBy("purpose")}>
          {/* Floated so the legend joins the grid like any other label. */}
          <legend className="hang-label float-left lg:pt-2.5">Purpose</legend>
          <div className="hang-body">
            <div className="flex flex-wrap">
              {PURPOSES.map((purpose) => (
                <label key={purpose.value} className="-ml-0.5 first:ml-0">
                  <input
                    type="radio"
                    name={fieldId("purpose")}
                    value={purpose.value}
                    checked={fields.purpose === purpose.value}
                    onChange={() => update("purpose", purpose.value)}
                    aria-invalid={Boolean(errors.purpose)}
                    className="peer sr-only"
                  />
                  <span className="block cursor-pointer border-2 border-ink px-4 py-2.5 font-semibold hover:bg-field peer-checked:bg-highlight peer-checked:text-on-highlight peer-checked:hover:bg-highlight peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ink">
                    {purpose.label}
                  </span>
                </label>
              ))}
            </div>
            {errorText("purpose")}
          </div>
        </fieldset>

        <div className="hang-row">
          <label htmlFor={fieldId("timeLimitMinutes")} className="hang-label lg:pt-2">
            Time Limit (minutes)
          </label>
          <div className="hang-body">
            <input
              id={fieldId("timeLimitMinutes")}
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={1}
              value={fields.timeLimitMinutes}
              onChange={(event) => update("timeLimitMinutes", event.target.value)}
              aria-invalid={Boolean(errors.timeLimitMinutes)}
              aria-describedby={describedBy("timeLimitMinutes")}
              className={`${inputClass("timeLimitMinutes")} max-w-24 tabular-nums`}
            />
            {errorText("timeLimitMinutes")}
          </div>
        </div>

        <div className="hang-row">
          <div className="hang-label flex flex-col items-start gap-2 lg:pt-3">
            <label htmlFor={fieldId("notes")}>
              Notes <span className="font-normal text-mute">(optional)</span>
            </label>
            <button
              type="button"
              onClick={() => void handleResearchAudience()}
              disabled={prepLoading}
              className="text-left text-sm font-semibold underline underline-offset-4 hover:bg-highlight hover:text-on-highlight disabled:opacity-50"
            >
              {prepLoading ? "Researching audience & topic…" : "Research audience & topic"}
            </button>
          </div>
          <div className="hang-body max-w-2xl">
            <textarea
              id={fieldId("notes")}
              rows={7}
              value={fields.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Key points, an outline, or your full script"
              className="block w-full resize-y border border-ink bg-transparent p-3 text-lg placeholder:text-mute focus:shadow-[inset_0_0_0_1px_var(--color-ink)] focus-visible:outline-none"
            />
            {prepError && <p className="mt-3 font-bold">{prepError}</p>}
            {prepResult && (
              <div className="mt-4 border-t-4 border-ink bg-field p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">Audience &amp; Evidence Prep (via Bright Data)</p>
                  <button
                    type="button"
                    onClick={insertInsightsIntoNotes}
                    className="font-semibold underline underline-offset-4 hover:bg-highlight hover:text-on-highlight"
                  >
                    Insert into Notes
                  </button>
                </div>
                <ul className="mt-3 flex flex-col gap-2 text-base leading-snug">
                  {prepResult.insights.map((insight) => (
                    <li key={insight} className="flex items-baseline gap-3">
                      <span aria-hidden className="size-1.5 shrink-0 -translate-y-0.5 bg-ink" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
                {prepResult.sources.length > 0 && (
                  <div className="mt-4 border-t border-ink/25 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-mute">Sources</p>
                    <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                      {prepResult.sources.map((source) => (
                        <li key={source.url} className="truncate">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4 hover:bg-highlight hover:text-on-highlight"
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hang-row">
          <div className="hang-body lg:col-start-3">
            <button type="submit" className="btn-primary">
              Continue
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
