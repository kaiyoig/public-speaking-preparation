export interface FacePoint {
  x: number
  y: number
}

export interface FaceBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Face {
  bounds: FaceBounds
  rightEye: FacePoint
  leftEye: FacePoint
  nose: FacePoint
  rightMouth: FacePoint
  leftMouth: FacePoint
  confidence: number
}

export function faceFromYuNetRow(data: Float32Array, offset: number): Face {
  const value = (index: number) => data[index] ?? 0

  return {
    bounds: {
      x: value(offset),
      y: value(offset + 1),
      width: value(offset + 2),
      height: value(offset + 3),
    },
    rightEye: { x: value(offset + 4), y: value(offset + 5) },
    leftEye: { x: value(offset + 6), y: value(offset + 7) },
    nose: { x: value(offset + 8), y: value(offset + 9) },
    rightMouth: { x: value(offset + 10), y: value(offset + 11) },
    leftMouth: { x: value(offset + 12), y: value(offset + 13) },
    confidence: value(offset + 14),
  }
}
