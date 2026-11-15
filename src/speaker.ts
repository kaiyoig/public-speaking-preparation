import { cookies } from "next/headers";
import { isSpeakerId, SPEAKER_COOKIE } from "./speakerCookie.ts";

/** The current browser's Speaker ID, or null if it has none yet. */
export async function getSpeakerId(): Promise<string | null> {
  const value = (await cookies()).get(SPEAKER_COOKIE)?.value;
  return isSpeakerId(value) ? value : null;
}
