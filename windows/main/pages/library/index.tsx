import { Film } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PlaybackPreferencesProvider } from '../../../shared/PlaybackPreferencesProvider'
import { useVlog } from '../../../shared/useVlogData'
import { RecordedFile } from '../../types'
import { DetailPage } from './detail'
import { DragDropWrapper } from './DragDropWrapper'
import { Sidebar } from './Sidebar'

export default function Page() {
  const [selectedVlogId, setSelectedVlogId] = useState<string | null>(null)
  const { vlog } = useVlog(selectedVlogId)

  function handleSelectVlog(next: RecordedFile) {
    setSelectedVlogId(next.id)
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVlogId) {
        setSelectedVlogId(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [selectedVlogId])

  return (
    <PlaybackPreferencesProvider>
      <DragDropWrapper>
        <div className="flex h-full w-screen overflow-hidden">
          <div className="overflow-y-auto">
            <Sidebar
              selectedVlog={vlog ?? null}
              onVideoSelect={handleSelectVlog}
              onClose={() => setSelectedVlogId(null)}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {vlog ? (
              <DetailPage
                key={vlog.id}
                vlog={vlog}
                onBack={() => {
                  setSelectedVlogId(null)
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center flex flex-col gap-2">
                  <div className=" flex justify-center">
                    <Film size={40} className="text-secondary" />
                  </div>
                  <h3 className="text-[15px] font-medium text-secondary mb-2">
                    Select a vlog or drag video files here
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
      </DragDropWrapper>
    </PlaybackPreferencesProvider>
  )
}
