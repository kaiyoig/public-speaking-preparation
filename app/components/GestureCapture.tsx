'use client'

import { useEffect } from 'react'
import type { GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision'

interface GestureCaptureProps {
  video: HTMLVideoElement
  recognizer: GestureRecognizer
  onGestures?: (result: GestureRecognizerResult, timestamp: number) => void
  minIntervalMs?: number
}

/** Runs recognition against the webcam video and exposes each frame's raw result. */
export default function GestureCapture({
  video,
  recognizer,
  onGestures,
  minIntervalMs = 0,
}: GestureCaptureProps) {
  useEffect(() => {
    let stopped = false
    let frame = 0
    let lastVideoTime = -1
    let lastProcessedAt = -Infinity
    const process = () => {
      if (stopped) return
      const now = performance.now()
      if (
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTime &&
        now - lastProcessedAt >= minIntervalMs
      ) {
        lastVideoTime = video.currentTime
        lastProcessedAt = now
        onGestures?.(recognizer.recognizeForVideo(video, now), now)
      }
      frame = requestAnimationFrame(process)
    }
    process()
    return () => { stopped = true; cancelAnimationFrame(frame) }
  }, [minIntervalMs, onGestures, recognizer, video])
  return null
}
