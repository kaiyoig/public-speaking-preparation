'use client'

import { useEffect, useState } from 'react'
import type { Expression, FacialExpressionProxy } from '../data/FacialExpression'
import type { WebcamData } from '../data/WebcamData'
import type { YuNetDetector } from './YuNetLoader'
import { useOpenCv } from '../hooks/useOpenCv'
import { detectExpressions } from '../data/detectExpressions'

interface CurrentExpressionListProps {
  webcamData: WebcamData
  detector: YuNetDetector
  expressionProxy: FacialExpressionProxy
}

export default function CurrentExpressionList({
  webcamData,
  detector,
  expressionProxy,
}: CurrentExpressionListProps) {
  const cv = useOpenCv()
  const [expressions, setExpressions] = useState<Expression[]>([])

  useEffect(() => {
    if (!cv) return

    const video = webcamData.video
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = video.videoWidth
    sourceCanvas.height = video.videoHeight
    let stopped = false
    let timeout = 0

    const updateExpressions = () => {
      if (stopped) return

      const result = detectExpressions(
        cv,
        video,
        detector,
        expressionProxy,
        sourceCanvas,
      )
      setExpressions(result.expressions)
      timeout = window.setTimeout(updateExpressions, 100)
    }

    updateExpressions()

    return () => {
      stopped = true
      window.clearTimeout(timeout)
    }
  }, [cv, detector, expressionProxy, webcamData])

  return (
    <section aria-label="Current facial expressions">
      <h2>Current expressions</h2>
      <ul>
        {expressions.map((expression, index) => (
          <li key={`${expression}-${index}`}>{expression}</li>
        ))}
      </ul>
    </section>
  )
}
