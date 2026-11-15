import type { Recording } from "@/domain/types";
import type { SpeechCapture } from "../SpeechCapture";
import { fakeLatency, pickRandom } from "./delay";

const CANNED_RECORDINGS: readonly Recording[] = [
  {
    transcript:
      "Good afternoon everyone. Today I want to talk about why small habits matter more than big goals. " +
      "Um, when I started running, I didn't aim for a marathon, I aimed for five minutes a day…",
    bodyLanguageObservations: [
      "Steady eye contact with the camera for most of the speech",
      "Hands stayed below the frame for the first minute",
      "Shifted weight from foot to foot during the middle section",
    ],
  },
  {
    transcript:
      "So the main reason I think this matters is, well, it affects all of us. " +
      "Let me give you three examples, starting with the one that surprised me most…",
    bodyLanguageObservations: [
      "Open hand gestures when listing examples",
      "Looked down at notes several times",
      "Smiled naturally at the opening",
    ],
  },
];

/** Fake capture: no camera or microphone, just a canned Recording. */
export class FakeSpeechCapture implements SpeechCapture {
  async start(): Promise<void> {
    await fakeLatency();
  }

  async stop(): Promise<Recording> {
    await fakeLatency();
    return pickRandom(CANNED_RECORDINGS);
  }
}
