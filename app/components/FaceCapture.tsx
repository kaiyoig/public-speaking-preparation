'use client'

import { useEffect, useRef } from 'react'
import type { Face } from '../data/Face'
import type { YuNetDetector } from './YuNetLoader'
import { useOpenCv } from '../hooks/useOpenCv'

interface FaceCaptureProps {
  video: HTMLVideoElement
  detector: YuNetDetector
  onFaces?: (faces: Face[]) => void
}

export default function FaceCapture({ video, detector, onFaces }: FaceCaptureProps) {
  const cv = useOpenCv()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!cv || !canvasRef.current) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = video.videoWidth
    sourceCanvas.height = video.videoHeight
    const context = sourceCanvas.getContext('2d')
    if (!context) return

    let animationFrame = 0
    let stopped = false

    const processFrame = () => {
      if (stopped) return

      context.save()
      context.translate(sourceCanvas.width, 0)
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height)
      context.restore()
      const frame = cv.imread(sourceCanvas)
      const detections = new cv.Mat()
      const faces: Face[] = []

      detector.setInputSize(new cv.Size(frame.cols, frame.rows))
      detector.detect(frame, detections)

      for (let i = 0; i < detections.rows; i += 1) {
        const offset = i * 15
        const data = detections.data32F
        const face: Face = {
          bounds: {
            x: data[offset],
            y: data[offset + 1],
            width: data[offset + 2],
            height: data[offset + 3],
          },
          rightEye: { x: data[offset + 4], y: data[offset + 5] },
          leftEye: { x: data[offset + 6], y: data[offset + 7] },
          nose: { x: data[offset + 8], y: data[offset + 9] },
          rightMouth: { x: data[offset + 10], y: data[offset + 11] },
          leftMouth: { x: data[offset + 12], y: data[offset + 13] },
          confidence: data[offset + 14],
        }

        faces.push(face)
        const { bounds } = face
        cv.rectangle(
          frame,
          new cv.Point(bounds.x, bounds.y),
          new cv.Point(bounds.x + bounds.width, bounds.y + bounds.height),
          [0, 255, 0, 255],
          2,
        )

        for (const eye of [face.rightEye, face.leftEye]) {
          cv.circle(frame, new cv.Point(eye.x, eye.y), 4, [255, 0, 0, 255], -1)
        }
      }

      onFaces?.(faces)
      cv.imshow(canvasRef.current!, frame)
      frame.delete()
      detections.delete()
      animationFrame = requestAnimationFrame(processFrame)
    }

    processFrame()

    return () => {
      stopped = true
      cancelAnimationFrame(animationFrame)
    }
  }, [cv, detector, onFaces, video])

  return <canvas ref={canvasRef} aria-label="YuNet face and eye tracking" />
}
