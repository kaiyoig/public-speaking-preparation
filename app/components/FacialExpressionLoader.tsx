'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createMobileFaceNetExpressionProxy, type FacialExpressionProxy } from '../data/FacialExpression'
import { useOpenCv } from '../hooks/useOpenCv'

interface FacialExpressionLoaderProps {
  children: (proxy: FacialExpressionProxy) => ReactNode
}

export default function FacialExpressionLoader({ children }: FacialExpressionLoaderProps) {
  const cv = useOpenCv()
  const [proxy, setProxy] = useState<FacialExpressionProxy>()

  useEffect(() => {
    if (!cv) return
    let cancelled = false

    createMobileFaceNetExpressionProxy(cv)
      .then((loadedProxy) => {
        if (cancelled) return
        setProxy(loadedProxy)
      })
      .catch((error) => {
        if (!cancelled) console.error('Facial expression model initialization failed', error)
      })

    return () => {
      cancelled = true
      setProxy(undefined)
    }
  }, [cv])

  return proxy ? children(proxy) : null
}
