import type { Face } from './Face'

export type Expression =
  | 'Looking right'
  | 'Looking left'
  | 'Looking straight'
  | 'Looking down'
  | 'Looking up'
  | 'Angry'
  | 'Disgust'
  | 'Fearful'
  | 'Happy'
  | 'Neutral'
  | 'Sad'
  | 'Surprised'

/** A replaceable expression recognizer fed by YuNet face data and the frame. */
export interface FacialExpressionProxy {
  identify(face: Face, frame?: any): Expression[]
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Landmark-only gaze direction proxy. */
export class LandmarkFacialExpression implements FacialExpressionProxy {
  identify(face: Face): Expression[] {
    const eyeCenter = midpoint(face.rightEye, face.leftEye)
    const mouthCenter = midpoint(face.rightMouth, face.leftMouth)
    const faceWidth = Math.max(face.bounds.width, 1)
    const faceHeight = Math.max(face.bounds.height, 1)
    const horizontalOffset = (face.nose.x - eyeCenter.x) / faceWidth
    const eyeToMouthDistance = Math.max(mouthCenter.y - eyeCenter.y, 1)
    const nosePosition = (face.nose.y - eyeCenter.y) / eyeToMouthDistance

    if (horizontalOffset > 0.06) return ['Looking right']
    if (horizontalOffset < -0.06) return ['Looking left']
    if (nosePosition > 0.6) return ['Looking down']
    if (nosePosition < 0.5) return ['Looking up']
    return ['Looking straight']
  }
}

const EMOTIONS: Expression[] = [
  'Angry',
  'Disgust',
  'Fearful',
  'Happy',
  'Neutral',
  'Sad',
  'Surprised',
]

export class MobileFaceNetFacialExpression implements FacialExpressionProxy {
  constructor(private readonly cv: any, private readonly model: any) { }

  identify(face: Face, frame?: any): Expression[] {
    if (!frame) return []

    const x = Math.max(0, Math.floor(face.bounds.x))
    const y = Math.max(0, Math.floor(face.bounds.y))
    const width = Math.min(Math.floor(face.bounds.width), frame.cols - x)
    const height = Math.min(Math.floor(face.bounds.height), frame.rows - y)
    if (width <= 0 || height <= 0) return []

    const roi = frame.roi(new this.cv.Rect(x, y, width, height))
    const rgb = new this.cv.Mat()
    const aligned = new this.cv.Mat()
    let blob: any

    try {
      this.cv.cvtColor(roi, rgb, this.cv.COLOR_RGBA2RGB)
      const sourcePoints = this.cv.matFromArray(3, 1, this.cv.CV_32FC2, [
        face.rightEye.x - x,
        face.rightEye.y - y,
        face.leftEye.x - x,
        face.leftEye.y - y,
        face.nose.x - x,
        face.nose.y - y,
      ])
      const targetPoints = this.cv.matFromArray(3, 1, this.cv.CV_32FC2, [
        38.2946,
        51.6963,
        73.5318,
        51.5014,
        56.0252,
        71.7366,
      ])
      const transform = this.cv.getAffineTransform(sourcePoints, targetPoints)
      this.cv.warpAffine(rgb, aligned, transform, new this.cv.Size(112, 112))
      sourcePoints.delete()
      targetPoints.delete()
      transform.delete()

      blob = this.cv.blobFromImage(
        aligned,
        2 / 255,
        new this.cv.Size(112, 112),
        new this.cv.Scalar(127.5, 127.5, 127.5, 0),
        false,
        false,
      )
      this.model.setInput(blob, 'data')
      const output = this.model.forward()
      const scores = output.data32F
      let bestIndex = 0

      for (let i = 1; i < scores.length; i += 1) {
        if (scores[i] > scores[bestIndex]) bestIndex = i
      }

      output.delete()
      return [EMOTIONS[bestIndex] ?? 'Neutral']
    } finally {
      blob?.delete()
      roi.delete()
      rgb.delete()
      aligned.delete()
    }
  }
}

const MOBILEFACENET_URL =
  'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/facial_expression_recognition/facial_expression_recognition_mobilefacenet_2022july.onnx'
const MOBILEFACENET_FILE = 'facial_expression_recognition_mobilefacenet_2022july.onnx'

export async function createMobileFaceNetExpressionProxy(cv: any) {
  const response = await fetch(MOBILEFACENET_URL)
  if (!response.ok) {
    throw new Error(`Could not load MobileFaceNet model: ${response.status}`)
  }

  const model = new Uint8Array(await response.arrayBuffer())
  if (model.byteLength < 10_000) {
    throw new Error(`MobileFaceNet model response was only ${model.byteLength} bytes`)
  }

  try {
    cv.FS_unlink(`/${MOBILEFACENET_FILE}`)
  } catch {
    // The model is not present on the first load.
  }

  cv.FS_createDataFile('/', MOBILEFACENET_FILE, model, true, false, false)
  const network = cv.readNetFromONNX(MOBILEFACENET_FILE)
  return new MobileFaceNetFacialExpression(cv, network)
}
