import { useState } from 'react'
import { EnrichedLog } from '../../../shared-types'
import { Button } from './Button'

interface Props {
  log: EnrichedLog
}

export function JsonViewer({ log }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full">
      <Button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Hide JSON' : 'Show JSON'}
      </Button>

      {isOpen && (
        <pre className="mt-2 p-3 bg-two rounded border border-secondary/20 text-xs text-secondary overflow-auto max-h-96 font-mono">
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </div>
  )
}
