import type { Recording } from "@/domain/types";

export interface SpeechCaptureStartOptions {
  /** Called in real time as the Speaker's words are transcribed. */
  onTranscript?: (text: string) => void;
}

/**
 * Captures the Speaker's camera and microphone and turns them into a Recording.
 *
 * Owner: Seven (OpenCV, speech-to-text).
 *
 * Contract:
 * - `start(options?)` begins capture and resolves once capture is running.
 * - `stop()` ends capture and resolves with the transcript and body-language
 *   observations for everything said since the matching `start()`.
 * - Calls alternate: start, stop, start, stop… The UI never calls `stop()`
 *   without a preceding `start()`.
 * - Rejects with an Error whose message can be shown to the Speaker.
 */
export interface SpeechCapture {
  start(options?: SpeechCaptureStartOptions): Promise<void>;
  stop(): Promise<Recording>;
}
