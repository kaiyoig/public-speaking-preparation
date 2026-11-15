'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useOpenCv } from '../hooks/useOpenCv'

const YUNET_MODEL_URL =
  'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx'
const YUNET_MODEL_FILE = 'face_detection_yunet_2023mar.onnx'

export type YuNetDetector = any

interface YuNetLoaderProps {
  children: (detector: YuNetDetector) => ReactNode
  onDetector?: ((detector: YuNetDetector | undefined) => void) | undefined
}

export default function YuNetLoader({ children, onDetector }: YuNetLoaderProps) {
  const cv = useOpenCv()
  const [detector, setDetector] = useState<YuNetDetector>()

  useEffect(() => {
    if (!cv || !cv.FaceDetectorYN) return

    let cancelled = false

    async function loadDetector() {
      const response = await fetch(YUNET_MODEL_URL)
      if (!response.ok) {
        throw new Error(`Could not load YuNet model: ${response.status}`)
      }

      const model = new Uint8Array(await response.arrayBuffer())
      const modelHeader = new TextDecoder().decode(model.slice(0, 64))
      if (modelHeader.includes('git-lfs.github.com/spec')) {
        throw new Error('YuNet model URL returned a Git LFS pointer')
      }
      if (model.byteLength < 10_000) {
        throw new Error(`YuNet model response was only ${model.byteLength} bytes`)
      }

      try {
        cv.FS?.unlink?.(`/${YUNET_MODEL_FILE}`)
      } catch {
        // The model is not present on the first load.
      }

      if (typeof cv.FS?.writeFile === 'function') {
        cv.FS.writeFile(`/${YUNET_MODEL_FILE}`, model)
      } else {
        cv.FS_createDataFile('/', YUNET_MODEL_FILE, model, true, false, false)
      }

      const loadedDetector = new cv.FaceDetectorYN(
        YUNET_MODEL_FILE,
        '',
        new cv.Size(320, 320),
        0.6,
        0.3,
        5000,
      )

      if (cancelled) {
        loadedDetector.delete()
        return
      }

      setDetector(loadedDetector)
    }

    loadDetector().catch((error) => {
      if (!cancelled) console.error('YuNet initialization failed', error)
    })

    return () => {
      cancelled = true
      setDetector((current: YuNetDetector | undefined) => {
        current?.delete()
        return undefined
      })
    }
  }, [cv])

  useEffect(() => {
    onDetector?.(detector)
  }, [detector, onDetector])

  return detector ? children(detector) : null
}
