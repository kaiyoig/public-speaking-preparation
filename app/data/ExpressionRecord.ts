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
  emotionProxy: FacialExpressionProxy
}

export class ExpressionRecord {
  private entries: ExpressionRecordEntry[] = []
  private listeners = new Set<() => void>()
  private timer: number | undefined
  private startedAt = 0
  private faceWasDetected = true

  constructor(public readonly timestep = 100) {}

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

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = session.video.videoWidth
    sourceCanvas.height = session.video.videoHeight

    const recordFrame = () => {
      const result: ExpressionDetection = detectExpressions(
        session.cv,
        session.video,
        session.detector,
        session.emotionProxy,
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
