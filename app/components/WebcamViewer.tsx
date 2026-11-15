'use client'

import { useRef, useState } from 'react'
import WebCam from 'react-webcam'
import type { WebcamData } from '../data/WebcamData'
import FaceCapture from './FaceCapture'
import YuNetLoader from './YuNetLoader'
import type { YuNetDetector } from './YuNetLoader'

interface WebcamViewerProps {
  onWebcamData?: (data: WebcamData) => void
  onDetector?: (detector: YuNetDetector | undefined) => void
}

export default function WebcamViewer({ onWebcamData, onDetector }: WebcamViewerProps) {
  const webcamRef = useRef<WebCam>(null)
  const [webcamData, setWebcamData] = useState<WebcamData>()

  function handleVideoReady() {
    const video = webcamRef.current?.video
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return
    const data = { video }
    setWebcamData(data)
    onWebcamData?.(data)
  }

  return (
    <div>
      <WebCam
        audio={false}
        ref={webcamRef}
        onLoadedMetadata={handleVideoReady}
        onUserMediaError={(error) => console.error(error)}
        forceScreenshotSourceSize
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 640,
          height: 480,
          facingMode: 'user',
        }}
        style={{
          position: 'absolute',
          width: 640,
          height: 480,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {webcamData && (
        <YuNetLoader onDetector={onDetector}>
          {(detector) => <FaceCapture video={webcamData.video} detector={detector} />}
        </YuNetLoader>
      )}
    </div>
  )
}
