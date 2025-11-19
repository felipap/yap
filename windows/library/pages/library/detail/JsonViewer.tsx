import { useState } from 'react'
import { EnrichedLog } from '../../../types'
import { HeaderButton } from './Toolbar/HeaderButton'

interface Props {
  log: EnrichedLog
}

export function JsonViewer({ log }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full">
      <HeaderButton onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '📋 Hide JSON' : '📋 Show JSON'}
      </HeaderButton>

      {isOpen && (
        <pre className="mt-2 p-3 bg-two rounded border border-secondary/20 text-xs text-secondary overflow-auto max-h-96 font-mono">
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </div>
  )
}
