"use client";

import { useId, useState, type FormEvent } from "react";
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
    errors.timeLimitMinutes = "Enter a Time Limit.";
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
  /** Prefills the form, e.g. when the Speaker chooses "Practise again". */
  initial?: SpeechBrief | undefined;
  onSubmit: (brief: SpeechBrief) => void;
}

/** Normal Mode Setup: the Speaker describes their speech. */
export function SpeechBriefForm({ initial, onSubmit }: SpeechBriefFormProps) {
  const [fields, setFields] = useState<Fields>(() => toFields(initial));
  const [submitted, setSubmitted] = useState(false);
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

  const fieldId = (key: keyof Fields) => `${id}-${key}`;
  const errorId = (key: keyof Fields) => `${id}-${key}-error`;
  const inputClass = (key: keyof Fields) =>
    `mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none focus:ring-2 dark:bg-neutral-950 dark:text-neutral-100 ${
      errors[key]
        ? "border-red-500 focus:ring-red-500/40"
        : "border-neutral-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-neutral-700"
    }`;
  const describedBy = (key: keyof Fields) => (errors[key] ? errorId(key) : undefined);
  const errorText = (key: keyof Fields) =>
    errors[key] ? (
      <p id={errorId(key)} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form noValidate onSubmit={handleSubmit} className="card flex flex-col gap-6 p-8">
      <div>
        <h2 className="text-xl font-semibold">Speech Brief</h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Tell the Host about your speech so it can ask the right Questions.
        </p>
      </div>

      <div>
        <label htmlFor={fieldId("audience")} className="font-medium">
          Audience
        </label>
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

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId("purpose")} className="font-medium">
            Purpose
          </label>
          <select
            id={fieldId("purpose")}
            value={fields.purpose}
            onChange={(event) => update("purpose", event.target.value as Purpose | "")}
            aria-invalid={Boolean(errors.purpose)}
            aria-describedby={describedBy("purpose")}
            className={inputClass("purpose")}
          >
            <option value="" disabled>
              Choose a purpose
            </option>
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>
                {purpose.label}
              </option>
            ))}
          </select>
          {errorText("purpose")}
        </div>

        <div>
          <label htmlFor={fieldId("timeLimitMinutes")} className="font-medium">
            Time Limit (minutes)
          </label>
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
            className={inputClass("timeLimitMinutes")}
          />
          {errorText("timeLimitMinutes")}
        </div>
      </div>

      <div>
        <label htmlFor={fieldId("notes")} className="font-medium">
          Notes <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <textarea
          id={fieldId("notes")}
          rows={6}
          value={fields.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Key points, an outline, or your full script"
          className={inputClass("notes")}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          Continue
        </button>
      </div>
    </form>
  );
}
