import type { HostBrain } from "./HostBrain";
import type { SpeechCapture } from "./SpeechCapture";
import type { TopicSource } from "./TopicSource";
import { BrowserSpeechCapture } from "./BrowserSpeechCapture";
import { BrightDataTopicSource } from "./BrightDataTopicSource";
import { GeminiHostBrain } from "./GeminiHostBrain";

export type { HostBrain, ReflectionInput } from "./HostBrain";
export type { SpeechCapture, SpeechCaptureStartOptions } from "./SpeechCapture";
export type { TopicSource } from "./TopicSource";

export interface Services {
  speechCapture: SpeechCapture;
  topicSource: TopicSource;
  hostBrain: HostBrain;
}

/**
 * The single place that picks fake vs real implementations.
 * The UI imports services only from here, never from `fakes/`.
 */
export const services: Services = {
  speechCapture: new BrowserSpeechCapture(),
  topicSource: new BrightDataTopicSource(),
  hostBrain: new GeminiHostBrain(),
};
