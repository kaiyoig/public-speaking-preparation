import type { Expression, FacialExpressionProxy } from './FacialExpression'
import { detectExpressions, type ExpressionDetection } from './detectExpressions'

export const FACE_NOT_DETECTED = 'FACE NOT DETECTED'

export interface ExpressionRecordEntry {
  timestamp: number
  expressions: string[]
}

export interface ExpressionRecordSession {
  cv: any
  video: HTMLVideoElement
  detector: any
  emotionProxy?: FacialExpressionProxy | undefined
}

export class ExpressionRecord {
  private entries: ExpressionRecordEntry[] = []
  private listeners = new Set<() => void>()
  private timer: number | undefined
  private startedAt = 0
  private faceWasDetected = true
  private currentEmotionProxy: FacialExpressionProxy | undefined

  constructor(public readonly timestep = 100) {}

  setEmotionProxy(proxy: FacialExpressionProxy | undefined) {
    this.currentEmotionProxy = proxy
  }

  getEntries() {
    return [...this.entries]
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start(session: ExpressionRecordSession) {
    this.stop()
    this.startedAt = performance.now()
    this.faceWasDetected = true
    if (session.emotionProxy) {
      this.currentEmotionProxy = session.emotionProxy
    }

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = session.video.videoWidth
    sourceCanvas.height = session.video.videoHeight

    const recordFrame = () => {
      if (session.video.videoWidth === 0 || session.video.videoHeight === 0) return
      const result: ExpressionDetection = detectExpressions(
        session.cv,
        session.video,
        session.detector,
        this.currentEmotionProxy,
        sourceCanvas,
      )
      const timestamp = (performance.now() - this.startedAt) / 1000

      if (result.faceDetected) {
        this.faceWasDetected = true
        this.entries.push({ timestamp, expressions: result.expressions })
        this.notify()
      } else if (this.faceWasDetected) {
        this.faceWasDetected = false
        this.entries.push({ timestamp, expressions: [FACE_NOT_DETECTED] })
        this.notify()
      }
    }

    recordFrame()
    this.timer = window.setInterval(recordFrame, this.timestep)
    this.notify()
  }

  stop() {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer)
      this.timer = undefined
    }
    this.notify()
  }

  clear() {
    this.entries = []
    this.notify()
  }

  isRecording() {
    return this.timer !== undefined
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }
}

const GAZE_DIRECTIONS = new Set([
  'Looking straight',
  'Looking left',
  'Looking right',
  'Looking down',
  'Looking up',
])

/**
 * Distills raw timestamped OpenCV YuNet gaze & MobileFaceNet facial expression entries
 * into structured, human-readable body language observations for Gemini and the Reflection UI.
 */
export function summarizeExpressionRecord(entries: ExpressionRecordEntry[]): string[] {
  if (entries.length === 0) return []

  let faceVisibleFrames = 0
  let faceMissingEvents = 0
  const gazeCounts = new Map<string, number>()
  const emotionCounts = new Map<string, number>()

  for (const entry of entries) {
    if (entry.expressions.includes(FACE_NOT_DETECTED)) {
      faceMissingEvents += 1
      continue
    }
    faceVisibleFrames += 1
    for (const expr of entry.expressions) {
      if (GAZE_DIRECTIONS.has(expr)) {
        gazeCounts.set(expr, (gazeCounts.get(expr) ?? 0) + 1)
      } else {
        emotionCounts.set(expr, (emotionCounts.get(expr) ?? 0) + 1)
      }
    }
  }

  const observations: string[] = []

  // 1. Eye Contact & Gaze Direction breakdown
  const totalGaze = Array.from(gazeCounts.values()).reduce((sum, n) => sum + n, 0)
  if (totalGaze > 0) {
    const straightPct = Math.round(((gazeCounts.get('Looking straight') ?? 0) / totalGaze) * 100)
    const otherGaze = Array.from(gazeCounts.entries())
      .filter(([dir, count]) => dir !== 'Looking straight' && count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([dir, count]) => `${dir.toLowerCase()} ${Math.round((count / totalGaze) * 100)}%`)

    const detail = otherGaze.length > 0 ? ` (${otherGaze.join(', ')})` : ''
    observations.push(`Eye Contact & Gaze: ${straightPct}% looking straight at camera${detail}`)
  }

  // 2. Facial Expression breakdown
  const totalEmotion = Array.from(emotionCounts.values()).reduce((sum, n) => sum + n, 0)
  if (totalEmotion > 0) {
    const sortedEmotions = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([emotion, count]) => `${emotion} ${Math.round((count / totalEmotion) * 100)}%`)
      .slice(0, 4)

    observations.push(`Facial Expressions: ${sortedEmotions.join(', ')}`)
  }

  // 3. Camera Presence & Framing
  if (faceVisibleFrames > 0 || faceMissingEvents > 0) {
    if (faceMissingEvents === 0) {
      observations.push(`Camera Presence: Face consistently in frame (${faceVisibleFrames} OpenCV samples)`)
    } else {
      observations.push(
        `Camera Presence: Face stepped out of frame or occluded ${faceMissingEvents} time${faceMissingEvents === 1 ? '' : 's'} (${faceVisibleFrames} samples captured)`,
      )
    }
  }

  // 4. Condensed timestamped timeline highlights (up to 5 key segments)
  interface Segment {
    start: number
    end: number
    label: string
  }
  const segments: Segment[] = []
  for (const entry of entries) {
    const label = entry.expressions.includes(FACE_NOT_DETECTED)
      ? 'Face out of frame'
      : entry.expressions.join(' + ')
    if (!label) continue
    const last = segments[segments.length - 1]
    if (last && last.label === label) {
      last.end = entry.timestamp
    } else {
      segments.push({ start: entry.timestamp, end: entry.timestamp, label })
    }
  }

  const notableSegments = segments
    .filter((s) => s.end - s.start >= 0.8 || segments.length <= 5)
    .slice(0, 5)
    .map((s) => `${s.start.toFixed(1)}s–${s.end.toFixed(1)}s: ${s.label}`)

  if (notableSegments.length > 0) {
    observations.push(`Camera Timeline: ${notableSegments.join(' · ')}`)
  }

  return observations
}
