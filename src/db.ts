import { neon } from "@neondatabase/serverless";
import type { Reflection } from "../domain/types.ts";
import type { ReflectionInput } from "../services/HostBrain.ts";

let schemaInitialized = false;

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

async function ensureSchema(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (schemaInitialized) return true;

  await sql`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id SERIAL PRIMARY KEY,
      mode TEXT NOT NULL,
      topic_or_audience TEXT NOT NULL,
      purpose TEXT,
      delivery_transcript TEXT NOT NULL,
      vocal_metrics JSONB,
      body_language JSONB,
      qa_answers JSONB,
      reflection JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  schemaInitialized = true;
  return true;
}

/**
 * Persists a completed public speaking practice session and its reflection
 * into Neon Postgres (`practice_sessions`) for cross-session progress tracking.
 */
export async function savePracticeSession(
  input: ReflectionInput,
  reflection: Reflection
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  try {
    await ensureSchema();

    const mode = input.mode;
    const topicOrAudience =
      input.mode === "normal" ? input.brief.audience : input.topicBriefing.topic;
    const purpose = input.mode === "normal" ? input.brief.purpose : "improv";
    const deliveryTranscript = input.delivery.transcript;
    const vocalMetricsJson = input.delivery.vocalMetrics
      ? JSON.stringify(input.delivery.vocalMetrics)
      : null;
    const bodyLanguageJson = JSON.stringify(
      input.delivery.bodyLanguageObservations
    );
    const qaAnswersJson =
      input.mode === "normal"
        ? JSON.stringify(input.answers.map((a) => a.transcript))
        : null;
    const reflectionJson = JSON.stringify(reflection);

    await sql`
      INSERT INTO practice_sessions (
        mode,
        topic_or_audience,
        purpose,
        delivery_transcript,
        vocal_metrics,
        body_language,
        qa_answers,
        reflection
      ) VALUES (
        ${mode},
        ${topicOrAudience},
        ${purpose},
        ${deliveryTranscript},
        ${vocalMetricsJson}::jsonb,
        ${bodyLanguageJson}::jsonb,
        ${qaAnswersJson}::jsonb,
        ${reflectionJson}::jsonb
      )
    `;
  } catch (error) {
    console.warn("Failed to persist practice session to Neon:", error);
  }
}

/**
 * Fetches concise summaries of the speaker's most recent practice sessions from Neon
 * so Gemini can reference cross-session growth (e.g. WPM, filler words, recurring habits).
 */
export async function getRecentSessionSummaries(
  limit = 3
): Promise<string[]> {
  const sql = getSql();
  if (!sql) return [];

  try {
    await ensureSchema();

    const rows = await sql`
      SELECT
        mode,
        topic_or_audience,
        vocal_metrics,
        reflection,
        created_at
      FROM practice_sessions
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((row, idx) => {
      const modeLabel = row.mode === "normal" ? "Normal Mode" : "Improv Mode";
      const target = String(row.topic_or_audience ?? "General");
      const metrics = row.vocal_metrics as
        | {
            wordsPerMinute?: number;
            fillerWordCount?: number;
            inflectionVariety?: string;
            volumeLevel?: string;
          }
        | null;
      const reflection = row.reflection as
        | {
            summary?: string;
            voiceAndDelivery?: { improvements?: string[] };
          }
        | null;

      const metricsPart = metrics
        ? `Pace: ${metrics.wordsPerMinute ?? 0} WPM, Fillers: ${metrics.fillerWordCount ?? 0}, Inflection: ${metrics.inflectionVariety ?? "n/a"}, Volume: ${metrics.volumeLevel ?? "n/a"}`
        : "No vocal metrics";

      const priorImprovement =
        reflection?.voiceAndDelivery?.improvements?.[0] ??
        reflection?.summary ??
        "";

      return `Prior Session #${idx + 1} (${modeLabel} - "${target}"): ${metricsPart}. Key coaching note: ${priorImprovement}`;
    });
  } catch (error) {
    console.warn("Failed to fetch recent practice sessions from Neon:", error);
    return [];
  }
}
