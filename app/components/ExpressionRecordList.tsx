'use client'

import { useEffect, useState } from 'react'
import type { ExpressionRecord } from '../data/ExpressionRecord'

interface ExpressionRecordListProps {
  record: ExpressionRecord
}

export default function ExpressionRecordList({ record }: ExpressionRecordListProps) {
  const [, refresh] = useState(0)

  useEffect(() => record.subscribe(() => refresh((value) => value + 1)), [record])

  return (
    <section aria-label="Expression record">
      <h2>Expression record</h2>
      <table>
        <thead>
          <tr>
            <th>Time (s)</th>
            <th>Expressions</th>
          </tr>
        </thead>
        <tbody>
          {record.getEntries().map((entry, index) => (
            <tr key={`${entry.timestamp}-${index}`}>
              <td>{entry.timestamp.toFixed(2)}</td>
              <td>{entry.expressions.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
