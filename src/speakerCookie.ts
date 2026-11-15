/**
 * The cookie that tells one browser's Speaker apart from another's, so
 * History and the Host's memory of prior Sessions stay with the browser
 * that made them. `proxy.ts` issues it on the first visit.
 */
export const SPEAKER_COOKIE = "rhetor_speaker";

/** Browsers cap cookie lifetimes at 400 days. */
export const SPEAKER_COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60;

const SPEAKER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isSpeakerId(value: string | undefined): value is string {
  return value != null && SPEAKER_ID_PATTERN.test(value);
}
