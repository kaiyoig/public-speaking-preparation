import type { GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision'
import { GestureMetrics, type GestureMetricValues } from './GestureMetrics'

export interface GestureMetricRecordEntry { timestamp: number; data: GestureMetricValues; capture: GestureRecognizerResult }
export interface GestureMetricRecordSession { video: HTMLVideoElement; recognizer: GestureRecognizer }

export class GestureMetricRecord {
  private entries: GestureMetricRecordEntry[] = []
  private listeners = new Set<() => void>()
  private recording = false
  private startedAt = 0
  private metrics = new GestureMetrics()
  private session: GestureMetricRecordSession | undefined
  private lastRecordedAt = -Infinity
  constructor(public readonly timestep = 100) {}
  getEntries() { return [...this.entries] }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  add(capture: GestureRecognizerResult, timestamp: number) {
    if (!this.recording) return
    const relative = (timestamp - this.startedAt) / 1000
    const data = this.metrics.update(capture, timestamp)
    if (this.entries.length > 0 && timestamp - this.lastRecordedAt < this.timestep) return
    this.lastRecordedAt = timestamp
    this.entries.push({ timestamp: relative, data, capture })
    this.listeners.forEach((listener) => listener())
  }
  start(session: GestureMetricRecordSession) { this.stop(); this.session = session; this.metrics.reset(); this.lastRecordedAt = -Infinity; this.startedAt = performance.now(); this.recording = true; this.listeners.forEach((listener) => listener()) }
  stop() { this.recording = false; this.listeners.forEach((listener) => listener()) }
  clear() { this.entries = []; this.listeners.forEach((listener) => listener()) }
  isRecording() { return this.recording }
}
