import { neon } from "@neondatabase/serverless";
import type {
  Mode,
  PracticeSessionDetail,
  PracticeSessionSummary,
  Reflection,
  VocalDeliveryMetrics,
} from "../domain/types.ts";
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

function mapSummaryRow(row: Record<string, unknown>): PracticeSessionSummary {
  const rawCreatedAt = row.created_at;
  const createdAt =
    rawCreatedAt instanceof Date
      ? rawCreatedAt.toISOString()
      : String(rawCreatedAt ?? new Date().toISOString());

  return {
    id: Number(row.id),
    mode: row.mode === "improv" ? ("improv" as Mode) : ("normal" as Mode),
    topicOrAudience: String(row.topic_or_audience ?? "Untitled session"),
    purpose: row.purpose != null ? String(row.purpose) : null,
    vocalMetrics: (row.vocal_metrics as VocalDeliveryMetrics | null) ?? null,
    reflection: row.reflection as Reflection,
    createdAt,
  };
}

/**
 * Lists recorded practice sessions from Neon Postgres, newest first.
 */
export async function listPracticeSessions(
  limit = 25
): Promise<PracticeSessionSummary[]> {
  const sql = getSql();
  if (!sql) return [];

  try {
    await ensureSchema();

    const rows = await sql`
      SELECT
        id,
        mode,
        topic_or_audience,
        purpose,
        vocal_metrics,
        reflection,
        created_at
      FROM practice_sessions
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => mapSummaryRow(row as Record<string, unknown>));
  } catch (error) {
    console.warn("Failed to list practice sessions from Neon:", error);
    return [];
  }
}

/**
 * Fetches a single practice session (including transcript, body language observations,
 * and Q&A answers) by ID from Neon Postgres.
 */
export async function getPracticeSessionById(
  id: number
): Promise<PracticeSessionDetail | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const sql = getSql();
  if (!sql) return null;

  try {
    await ensureSchema();

    const rows = await sql`
      SELECT
        id,
        mode,
        topic_or_audience,
        purpose,
        delivery_transcript,
        vocal_metrics,
        body_language,
        qa_answers,
        reflection,
        created_at
      FROM practice_sessions
      WHERE id = ${id}
      LIMIT 1
    `;

    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      ...mapSummaryRow(row),
      deliveryTranscript: String(row.delivery_transcript ?? ""),
      bodyLanguage: Array.isArray(row.body_language)
        ? (row.body_language as string[])
        : [],
      qaAnswers: Array.isArray(row.qa_answers)
        ? (row.qa_answers as string[])
        : null,
    };
  } catch (error) {
    console.warn("Failed to fetch practice session detail from Neon:", error);
    return null;
  }
}
