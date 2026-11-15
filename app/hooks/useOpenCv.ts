'use client'

import { useEffect, useState } from 'react'

export function useOpenCv() {
  const [cv, setCv] = useState<any>(() =>
    typeof window !== 'undefined' ? window.cv : undefined,
  )

  useEffect(() => {
    if (window.cv) {
      setCv(window.cv)
      return
    }

    const handleReady = () => setCv(window.cv)
    window.addEventListener('opencv-ready', handleReady)

    return () => window.removeEventListener('opencv-ready', handleReady)
  }, [])

  return cv
}
