import type { Recording } from "@/domain/types";

/**
 * Captures the Speaker's camera and microphone and turns them into a Recording.
 *
 * Owner: Seven (OpenCV, speech-to-text).
 *
 * Contract:
 * - `start()` begins capture and resolves once capture is running.
 * - `stop()` ends capture and resolves with the transcript and body-language
 *   observations for everything said since the matching `start()`.
 * - Calls alternate: start, stop, start, stop… The UI never calls `stop()`
 *   without a preceding `start()`.
 * - Rejects with an Error whose message can be shown to the Speaker.
 */
export interface SpeechCapture {
  start(): Promise<void>;
  stop(): Promise<Recording>;
}
