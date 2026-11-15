'use client'

import { useEffect } from 'react'
import type { GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision'

interface GestureCaptureProps { video: HTMLVideoElement; recognizer: GestureRecognizer; onGestures?: (result: GestureRecognizerResult, timestamp: number) => void }

/** Runs recognition against the webcam video and exposes each frame's raw result. */
export default function GestureCapture({ video, recognizer, onGestures }: GestureCaptureProps) {
  useEffect(() => {
    let stopped = false
    let frame = 0
    let lastVideoTime = -1
    const process = () => {
      if (stopped) return
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        const timestamp = performance.now()
        onGestures?.(recognizer.recognizeForVideo(video, timestamp), timestamp)
      }
      frame = requestAnimationFrame(process)
    }
    process()
    return () => { stopped = true; cancelAnimationFrame(frame) }
  }, [onGestures, recognizer, video])
  return null
}
