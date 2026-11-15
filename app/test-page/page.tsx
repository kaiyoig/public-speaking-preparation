'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PageTransition } from '@/components/PageTransition'
import { Shell } from '@/components/Shell'
import { ExpressionRecord } from '../data/ExpressionRecord'
import { GestureMetricRecord } from '../data/GestureMetricRecord'
import { useGestureRecognizer } from '../data/GestureRecognizer'
import type { FacialExpressionProxy } from '../data/FacialExpression'
import type { WebcamData } from '../data/WebcamData'
import { useOpenCv } from '../hooks/useOpenCv'
import type { YuNetDetector } from '../components/YuNetLoader'
import CurrentExpressionList from '../components/CurrentExpressionList'
import ExpressionRecordList from '../components/ExpressionRecordList'
import GestureCapture from '../components/GestureCapture'
import GestureMetricRecordList from '../components/GestureMetricRecordList'
import FacialExpressionLoader from '../components/FacialExpressionLoader'
import WebcamViewer from '../components/WebcamViewer'

export default function Page() {
  const [webcamData, setWebcamData] = useState<WebcamData>()
  const [detector, setDetector] = useState<YuNetDetector>()
  const [isRecording, setIsRecording] = useState(false)
  const [facialModelError, setFacialModelError] = useState<string>()
  const cv = useOpenCv()
  const gestureRecognizer = useGestureRecognizer()
  const recordRef = useRef<ExpressionRecord | undefined>(undefined)
  if (!recordRef.current) recordRef.current = new ExpressionRecord(100)
  const record = recordRef.current
  const gestureRecordRef = useRef<GestureMetricRecord | undefined>(undefined)
  if (!gestureRecordRef.current) gestureRecordRef.current = new GestureMetricRecord(100)
  const gestureRecord = gestureRecordRef.current

  const handleWebcamData = useCallback((data: WebcamData) => {
    setWebcamData(data)
  }, [])

  const handleDetector = useCallback((nextDetector: YuNetDetector | undefined) => {
    setDetector(nextDetector)
    if (nextDetector) setFacialModelError(undefined)
  }, [])

  const handleFacialModelError = useCallback((error: unknown) => {
    setFacialModelError(error instanceof Error ? error.message : 'The facial expression model could not be loaded.')
  }, [])

  useEffect(() => () => { record.stop(); gestureRecord.stop() }, [gestureRecord, record])

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

  const handleGestures = useCallback((result: Parameters<GestureMetricRecord['add']>[0], timestamp: number) => {
    gestureRecord.add(result, timestamp)
  }, [gestureRecord])

  function toggleGestureRecording() {
    if (gestureRecord.isRecording()) {
      gestureRecord.stop()
      return
    }
    if (!webcamData || !gestureRecognizer) return
    gestureRecord.clear()
    gestureRecord.start({ video: webcamData.video, recognizer: gestureRecognizer })
  }

  return (
    <PageTransition>
      <Shell
        dense
        wordmarkLinksHome={false}
        rail={
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-mute">Developer preview</p>
              <p className="mt-3 max-w-[18ch] text-lg leading-tight font-medium">
                Camera analysis for facial expression and hand gesture tracking.
              </p>
            </div>
            <nav aria-label="Test page navigation" className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-col">
              <Link href="/" className="text-link self-start text-lg">Back to home</Link>
              <Link href="/about" className="text-link self-start text-lg">About Rhetor</Link>
            </nav>
          </div>
        }
      >
        <div className="flex flex-col gap-10">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-ink pb-6">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-signal">Live analysis</p>
              <h1 className="text-[clamp(2.8rem,7vw,6rem)] font-bold leading-[0.88] tracking-[-0.05em] font-display">
                Camera lab<span className="text-highlight">.</span>
              </h1>
            </div>
            <p className="max-w-[26ch] text-base leading-snug text-mute">
              Allow camera access, then record a sample to inspect movement over time.
            </p>
          </header>

          <section aria-label="Camera and controls" className="grid gap-8 lg:grid-cols-7 lg:gap-10">
            <div className="lg:col-span-4">
              <WebcamViewer
                onWebcamData={handleWebcamData}
                onDetector={handleDetector}
                className="aspect-video border-2 border-ink bg-field"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-mute">
                <span className="flex items-center gap-2">
                  <span className="live-mark" aria-hidden="true" />
                  {webcamData ? 'Camera connected' : 'Waiting for camera'}
                </span>
                <span>{gestureRecognizer ? 'Gesture model ready' : 'Loading gesture model…'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-3">
              <div className="rule-top">
                <h2 className="text-2xl font-bold tracking-tight font-display">Record a sample</h2>
                <p className="mt-2 max-w-[34ch] leading-snug text-mute">
                  Each recorder clears its previous entries when started.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3">
                {webcamData && detector ? (
                  <FacialExpressionLoader onError={handleFacialModelError}>
                    {(proxy) => (
                      <button className={isRecording ? 'btn-secondary' : 'btn-primary'} type="button" onClick={() => toggleRecording(proxy)}>
                        {isRecording ? 'Stop facial recording' : 'Record facial expressions'}
                      </button>
                    )}
                  </FacialExpressionLoader>
                ) : (
                  <button className="btn-secondary" type="button" disabled>
                    {webcamData ? 'Face detector loading…' : 'Waiting for camera…'}
                  </button>
                )}
                <button
                  className={gestureRecord.isRecording() ? 'btn-secondary' : 'btn-primary'}
                  type="button"
                  onClick={toggleGestureRecording}
                  disabled={!webcamData || !gestureRecognizer}
                >
                  {gestureRecord.isRecording() ? 'Stop gesture recording' : 'Record hand gestures'}
                </button>
              </div>
              <p className="border-t border-ink/15 pt-3 text-sm text-mute">
                Gesture metrics include smoothed wrist movement, hand proximity duration, and the highest-scoring MediaPipe gesture.
              </p>
            </div>
          </section>

          {webcamData && gestureRecognizer && (
            <GestureCapture video={webcamData.video} recognizer={gestureRecognizer} onGestures={handleGestures} />
          )}

          {webcamData && detector && (
            <FacialExpressionLoader>
              {(proxy) => (
            <section aria-label="Current facial expressions" className="grid gap-8 border-t-2 border-ink pt-6 lg:grid-cols-7 lg:gap-10">
                  <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold tracking-tight font-display">Current face</h2>
                    <CurrentExpressionList webcamData={webcamData} detector={detector} expressionProxy={proxy} />
                  </div>
                  <div className="overflow-x-auto lg:col-span-5 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:font-display [&_table]:w-full [&_th]:border-b [&_th]:border-ink/20 [&_th]:pb-2 [&_th]:text-left [&_th]:text-sm [&_th]:text-mute [&_td]:border-b [&_td]:border-ink/10 [&_td]:px-2 [&_td]:py-3 [&_td]:align-top [&_td]:text-sm">
                    <ExpressionRecordList record={record} />
                  </div>
                </section>
              )}
            </FacialExpressionLoader>
          )}

          {facialModelError && (
            <p role="alert" className="border-t-2 border-signal pt-3 text-sm text-signal">
              Facial expression model failed: {facialModelError}
            </p>
          )}

          <section aria-label="Gesture record" className="border-t-2 border-ink pt-6">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-display">Gesture record</h2>
                <p className="mt-1 text-mute">Timestamped hand landmarks and classifications.</p>
              </div>
              <span className="text-sm text-mute">{gestureRecord.isRecording() ? 'Recording now' : 'Ready'}</span>
            </div>
            <div className="overflow-x-auto [&_h2]:sr-only [&_table]:w-full [&_th]:border-b [&_th]:border-ink/20 [&_th]:pb-2 [&_th]:text-left [&_th]:text-sm [&_th]:text-mute [&_td]:border-b [&_td]:border-ink/10 [&_td]:px-2 [&_td]:py-3 [&_td]:align-top [&_td]:text-sm">
              <GestureMetricRecordList record={gestureRecord} />
            </div>
          </section>
        </div>
      </Shell>
    </PageTransition>
  )
}
