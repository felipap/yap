import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { RecordedFile } from '../../types'
import { DetailPage } from './detail'
import { Sidebar } from './Sidebar'
import { PlaybackPreferencesProvider } from '../../shared/PlaybackPreferencesProvider'
import { DragDropWrapper } from './DragDropWrapper'

export default function Page() {
  const [selectedVlog, setSelectedVlog] = useState<RecordedFile | null>(null)

  function handleSelectVlog(next: RecordedFile) {
    setSelectedVlog(next)
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVlog) {
        setSelectedVlog(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [selectedVlog])

  return (
    <PlaybackPreferencesProvider>
      <DragDropWrapper>
        <div className="flex h-full w-screen overflow-hidden">
          <div className="overflow-y-auto">
            <Sidebar
              selectedVlog={selectedVlog}
              onVideoSelect={handleSelectVlog}
              onClose={() => setSelectedVlog(null)}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {selectedVlog ? (
              <DetailPage
                key={selectedVlog?.id}
                vlog={selectedVlog}
                onBack={() => {
                  setSelectedVlog(null)
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
