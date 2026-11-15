'use client'

import { useEffect, useState } from 'react'
import type { GestureMetricRecord } from '../data/GestureMetricRecord'

export default function GestureMetricRecordList({ record }: { record: GestureMetricRecord }) {
  const [, refresh] = useState(0)
  useEffect(() => {
    const unsubscribe = record.subscribe(() => refresh((value) => value + 1))
    return () => { unsubscribe() }
  }, [record])
  return <section aria-label="Gesture metric record">
    <h2>Gesture record</h2>
    <table><thead><tr><th>Time (s)</th><th>Hands</th><th>Proximity</th><th>Movements</th></tr></thead><tbody>
      {record.getEntries().map((entry, index) => <tr key={`${entry.timestamp}-${index}`}>
        <td>{entry.timestamp.toFixed(2)}</td>
        <td>{entry.data.hands.map((hand) => `${hand.handedness}: ${hand.gesture} (${hand.movement.toFixed(3)})`).join(', ') || 'None'}</td>
        <td>{entry.data.handProximity?.toFixed(3) ?? '—'} ({entry.data.proximityDuration.toFixed(1)}s)</td>
        <td>{entry.data.movementFrequency}</td>
      </tr>)}
    </tbody></table>
  </section>
}
