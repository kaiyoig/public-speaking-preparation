'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ExpressionRecord } from './data/ExpressionRecord'
import type { FacialExpressionProxy } from './data/FacialExpression'
import type { WebcamData } from './data/WebcamData'
import { useOpenCv } from './hooks/useOpenCv'
import type { YuNetDetector } from './components/YuNetLoader'
import CurrentExpressionList from './components/CurrentExpressionList'
import ExpressionRecordList from './components/ExpressionRecordList'
import FacialExpressionLoader from './components/FacialExpressionLoader'
import WebcamViewer from './components/WebcamViewer'

export default function Page() {
  const [webcamData, setWebcamData] = useState<WebcamData>()
  const [detector, setDetector] = useState<YuNetDetector>()
  const [isRecording, setIsRecording] = useState(false)
  const cv = useOpenCv()
  const recordRef = useRef<ExpressionRecord | undefined>(undefined)
  if (!recordRef.current) recordRef.current = new ExpressionRecord(100)
  const record = recordRef.current

  const handleWebcamData = useCallback((data: WebcamData) => {
    setWebcamData(data)
  }, [])

  const handleDetector = useCallback((nextDetector: YuNetDetector | undefined) => {
    setDetector(nextDetector)
  }, [])

  useEffect(() => () => record.stop(), [record])

  function toggleRecording(proxy: FacialExpressionProxy) {
    if (record.isRecording()) {
      record.stop()
      setIsRecording(false)
      return
    }

    if (!cv || !webcamData || !detector) return
    record.clear()
    record.start({ cv, video: webcamData.video, detector, emotionProxy: proxy })
    setIsRecording(true)
  }

  return (
    <main style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
      <h1>Hi</h1>
      <WebcamViewer
        onWebcamData={handleWebcamData}
        onDetector={handleDetector}
      />
      {webcamData && detector && (
        <FacialExpressionLoader>
          {(proxy) => (
            <>
              <div>
                <CurrentExpressionList
                  webcamData={webcamData}
                  detector={detector}
                  expressionProxy={proxy}
                />
                <button type="button" onClick={() => toggleRecording(proxy)}>
                  {isRecording ? 'Stop recording' : 'Play recording'}
                </button>
              </div>
              <ExpressionRecordList record={record} />
            </>
          )}
        </FacialExpressionLoader>
      )}
    </main>
  )
}
