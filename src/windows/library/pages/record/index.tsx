import { useCallback } from 'react'
import { useRouter } from '../../../shared/Router'
import { RecordInner } from './Inner'

export function RecordPage() {
  const router = useRouter()

  const close = useCallback(() => {
    router.navigate({ name: 'library' })
  }, [router])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-one/40 relative">
      <RecordInner close={close} />
    </div>
  )
}
