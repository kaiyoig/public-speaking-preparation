'use client'

import { useRef, useState } from 'react'
import WebCam from 'react-webcam'
import type { WebcamData } from '../data/WebcamData'
import YuNetLoader from './YuNetLoader'
import type { YuNetDetector } from './YuNetLoader'

interface WebcamViewerProps {
  onWebcamData?: (data: WebcamData) => void
  onDetector?: (detector: YuNetDetector | undefined) => void
  hidden?: boolean
  className?: string
}

export default function WebcamViewer({
  onWebcamData,
  onDetector,
  hidden = false,
  className = 'aspect-video',
}: WebcamViewerProps) {
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
    <div className={`relative w-full overflow-hidden bg-field ${className}`}>
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
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          visibility: hidden ? 'hidden' : 'visible',
        }}
      />
      {webcamData && onDetector && (
        <YuNetLoader onDetector={onDetector}>
          {() => null}
        </YuNetLoader>
      )}
    </div>
  )
}
