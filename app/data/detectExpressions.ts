import type { Face } from './Face'
import { faceFromYuNetRow } from './Face'
import {
  LandmarkFacialExpression,
  type Expression,
  type FacialExpressionProxy,
} from './FacialExpression'

export interface ExpressionDetection {
  expressions: Expression[]
  faceDetected: boolean
}

export function detectExpressions(
  cv: any,
  video: HTMLVideoElement,
  detector: any,
  emotionProxy: FacialExpressionProxy | undefined,
  sourceCanvas: HTMLCanvasElement,
): ExpressionDetection {
  const context = sourceCanvas.getContext('2d')
  if (!context) return { expressions: [], faceDetected: false }

  context.save()
  context.translate(sourceCanvas.width, 0)
  context.scale(-1, 1)
  context.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height)
  context.restore()

  const frame = cv.imread(sourceCanvas)
  const detections = new cv.Mat()
  const gazeProxy = new LandmarkFacialExpression()
  const expressions: Expression[] = []

  try {
    detector.setInputSize(new cv.Size(frame.cols, frame.rows))
    detector.detect(frame, detections)

    for (let i = 0; i < detections.rows; i += 1) {
      const face: Face = faceFromYuNetRow(detections.data32F, i * 15)
      expressions.push(...gazeProxy.identify(face))
      if (emotionProxy) {
        expressions.push(...emotionProxy.identify(face, frame))
      }
    }

    return { expressions, faceDetected: detections.rows > 0 }
  } finally {
    frame.delete()
    detections.delete()
  }
}
