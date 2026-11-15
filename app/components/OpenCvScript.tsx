'use client'

import Script from 'next/script'

const OPENCV_URL = 'https://docs.opencv.org/5.x/opencv.js'

function notifyOpenCvReady() {
  window.dispatchEvent(new Event('opencv-ready'))
}

export default function OpenCvScript() {
  return (
    <Script
      src={OPENCV_URL}
      strategy="afterInteractive"
      onReady={() => {
        const runtime = window.cv
        if (!runtime) return

        if (typeof runtime.then === 'function') {
          runtime.then((module: any) => {
            window.cv = module
            notifyOpenCvReady()
          })
          return
        }

        if (runtime.calledRun) {
          notifyOpenCvReady()
          return
        }

        const previous = runtime.onRuntimeInitialized
        runtime.onRuntimeInitialized = () => {
          previous?.()
          notifyOpenCvReady()
        }
      }}
    />
  )
}
