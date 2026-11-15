'use client'

import { useEffect, useState } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'

// Keep the hosted runtime in lockstep with the installed package. A mismatched
// WASM runtime can fail before the recognizer reports a useful model error.
const MEDIAPIPE_VERSION = '1.2.3'
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

/** Loads the MediaPipe recognizer once and returns it when ready. */
export function useGestureRecognizer() {
  const [recognizer, setRecognizer] = useState<GestureRecognizer>()

  useEffect(() => {
    let cancelled = false
    FilesetResolver.forVisionTasks(WASM_ROOT)
      .then((fileset) => GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      }))
      .then((next) => { if (!cancelled) setRecognizer(next) })
      .catch((error) => { if (!cancelled) console.error('Gesture recognizer initialization failed', error) })

    return () => { cancelled = true }
  }, [])

  return recognizer
}
