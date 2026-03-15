import { useCallback } from 'react'
import { RecordInner } from './Inner'

export function RecordPage() {
  const close = useCallback(() => {
    window.close()
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-one/40 relative">
      <div className="h-10 bg-black/40 top-0 left-0 right-0 absolute z-10 drag-region"></div>
      <RecordInner close={close} />
    </div>
  )
}
