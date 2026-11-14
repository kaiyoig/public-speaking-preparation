import type { HostBrain } from "./HostBrain";
import type { SpeechCapture } from "./SpeechCapture";
import type { TopicSource } from "./TopicSource";
import { FakeHostBrain } from "./fakes/FakeHostBrain";
import { FakeSpeechCapture } from "./fakes/FakeSpeechCapture";
import { FakeTopicSource } from "./fakes/FakeTopicSource";

export type { HostBrain, ReflectionInput } from "./HostBrain";
export type { SpeechCapture } from "./SpeechCapture";
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
  speechCapture: new FakeSpeechCapture(),
  topicSource: new FakeTopicSource(),
  hostBrain: new FakeHostBrain(),
};
