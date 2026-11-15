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

const GESTURE_LABELS: Record<string, string> = {
  Open_Palm: 'Open Palm',
  Closed_Fist: 'Closed Fist',
  Pointing_Up: 'Pointing Up',
  Thumb_Up: 'Thumb Up',
  Thumb_Down: 'Thumb Down',
  Victory: 'Victory',
  ILoveYou: 'I Love You',
  None: 'Neutral Hand',
}

function formatGestureName(raw: string): string {
  return GESTURE_LABELS[raw] ?? raw.replace(/_/g, ' ')
}

/**
 * Parses and summarizes recorded gesture telemetry (or raw GestureMetricRecordEntry[] / JSON string)
 * into structured, human-readable body language observations for the Gemini prompt and Reflection UI.
 */
export function summarizeGestureRecord(
  entriesOrJson: GestureMetricRecordEntry[] | string,
  speechDurationSeconds?: number,
): string[] {
  let entries: GestureMetricRecordEntry[] = []

  if (typeof entriesOrJson === 'string') {
    try {
      const parsed = JSON.parse(entriesOrJson) as unknown
      if (Array.isArray(parsed)) {
        entries = parsed as GestureMetricRecordEntry[]
      }
    } catch {
      return []
    }
  } else {
    entries = entriesOrJson
  }

  if (entries.length === 0) return []

  let framesWithHands = 0
  let framesWithTwoHands = 0
  const gestureCounts = new Map<string, number>()
  const proximitySamples: number[] = []
  let maxMovementFrequency = 0
  let maxProximityDuration = 0

  for (const entry of entries) {
    const data = entry.data
    if (!data) continue

    if (data.movementFrequency > maxMovementFrequency) {
      maxMovementFrequency = data.movementFrequency
    }
    if (data.proximityDuration > maxProximityDuration) {
      maxProximityDuration = data.proximityDuration
    }
    if (typeof data.handProximity === 'number') {
      proximitySamples.push(data.handProximity)
    }

    const hands = Array.isArray(data.hands) ? data.hands : []
    if (hands.length > 0) {
      framesWithHands += 1
      if (hands.length >= 2) framesWithTwoHands += 1
      for (const hand of hands) {
        const label = formatGestureName(hand.gesture || 'None')
        gestureCounts.set(label, (gestureCounts.get(label) ?? 0) + 1)
      }
    }
  }

  const totalFrames = entries.length
  const handVisibilityPct = Math.round((framesWithHands / Math.max(1, totalFrames)) * 100)
  const lastEntry = entries[entries.length - 1]
  const effectiveDuration = Math.max(
    1,
    speechDurationSeconds ?? (lastEntry ? Math.ceil(lastEntry.timestamp) : 1),
  )

  const observations: string[] = []

  if (framesWithHands === 0) {
    observations.push(
      'Hand Gestures: No hands detected in camera frame (hands kept below frame or out of view)',
    )
    return observations
  }

  // 1. Hand visibility & classified gestures breakdown
  const totalHandInstances = Array.from(gestureCounts.values()).reduce((sum, n) => sum + n, 0)
  const topGestures = Array.from(gestureCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} ${Math.round((count / Math.max(1, totalHandInstances)) * 100)}%`)

  observations.push(
    `Hand Gestures: Hands visible in ${handVisibilityPct}% of frames (${topGestures.join(', ')})`,
  )

  // 2. Hand movement frequency & dynamics
  const movementsPerMin = Math.round((maxMovementFrequency / effectiveDuration) * 60)
  const activityLabel =
    movementsPerMin < 8
      ? 'minimal hand movement'
      : movementsPerMin <= 45
        ? 'natural, expressive gesture pacing'
        : 'high-frequency / rapid hand movement'

  observations.push(
    `Gesture Movement: ${maxMovementFrequency} deliberate hand movements (${movementsPerMin}/min · ${activityLabel})`,
  )

  // 3. Hand proximity / clasping
  if (framesWithTwoHands > 0 || maxProximityDuration > 0) {
    const avgProximity =
      proximitySamples.length > 0
        ? (proximitySamples.reduce((s, v) => s + v, 0) / proximitySamples.length).toFixed(2)
        : null
    const claspedNote =
      maxProximityDuration >= 0.5
        ? `hands held close/clasped for ${maxProximityDuration.toFixed(1)}s`
        : 'hands kept open and unclasped'
    const separationNote = avgProximity ? ` (avg two-hand separation ${avgProximity})` : ''
    observations.push(`Hand Posture & Spacing: ${claspedNote}${separationNote}`)
  }

  return observations
}
