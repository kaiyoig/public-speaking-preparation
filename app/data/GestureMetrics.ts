import type { GestureRecognizerResult } from '@mediapipe/tasks-vision'

export interface HandMetric {
  handedness: string
  gesture: string
  gestureScore: number
  wrist: { x: number; y: number; z: number }
  movement: number
}

export interface GestureMetricValues {
  hands: HandMetric[]
  handProximity: number | null
  proximityDuration: number
  movementFrequency: number
}

const SMOOTHING = 0.35
const MOVEMENT_THRESHOLD = 0.012

/** Converts raw recognizer output into stable, hand-associated measurements. */
export class GestureMetrics {
  private previous = new Map<string, { x: number; y: number; z: number }>()
  private movementCount = 0
  private lastTimestamp = -Infinity
  private proximityDuration = 0

  update(result: GestureRecognizerResult, timestamp: number): GestureMetricValues {
    const previousTimestamp = this.lastTimestamp
    const hands: HandMetric[] = []
    const current = new Map<string, { x: number; y: number; z: number }>()

    result.landmarks.forEach((landmarks, index) => {
      const wrist = landmarks[0]
      const handedness = result.handedness[index]?.[0]?.categoryName || `hand-${index}`
      if (!wrist) return
      const prior = this.previous.get(handedness)
      const smoothed = prior
        ? { x: prior.x + (wrist.x - prior.x) * SMOOTHING, y: prior.y + (wrist.y - prior.y) * SMOOTHING, z: prior.z + (wrist.z - prior.z) * SMOOTHING }
        : { x: wrist.x, y: wrist.y, z: wrist.z }
      const movement = prior ? Math.hypot(smoothed.x - prior.x, smoothed.y - prior.y, smoothed.z - prior.z) : 0
      if (prior && movement >= MOVEMENT_THRESHOLD && timestamp > this.lastTimestamp) this.movementCount += 1
      current.set(handedness, smoothed)
      const gesture = [...(result.gestures[index] ?? [])].sort((a, b) => b.score - a.score)[0]
      hands.push({ handedness, gesture: gesture?.categoryName || 'None', gestureScore: gesture?.score || 0, wrist: smoothed, movement })
    })

    this.previous = current
    this.lastTimestamp = timestamp
    const wrists = hands.map((hand) => hand.wrist)
    const firstWrist = wrists[0]
    const secondWrist = wrists[1]
    const handProximity = firstWrist && secondWrist
      ? Math.hypot(firstWrist.x - secondWrist.x, firstWrist.y - secondWrist.y, firstWrist.z - secondWrist.z)
      : null
    if (handProximity !== null && handProximity < 0.2 && previousTimestamp !== -Infinity) {
      this.proximityDuration += Math.max(0, timestamp - previousTimestamp) / 1000
    }
    return { hands, handProximity, proximityDuration: this.proximityDuration, movementFrequency: this.movementCount }
  }

  reset() { this.previous.clear(); this.movementCount = 0; this.proximityDuration = 0; this.lastTimestamp = -Infinity }
}
