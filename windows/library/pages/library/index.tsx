import { MdMovie } from 'react-icons/md'
import { useState } from 'react'
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

  return (
    <PlaybackPreferencesProvider>
      <DragDropWrapper>
        <div className="flex h-full w-screen overflow-hidden">
          <div className="h-full border-r bg-sidebar">
            <Sidebar
              selectedVlog={vlog ?? null}
              onVideoSelect={handleSelectVlog}
              onClose={() => setSelectedVlogId(null)}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#202020]">
            {vlog ? (
              <DetailPage
                key={vlog.id}
                log={vlog}
                onBack={() => setSelectedVlogId(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center select-none">
                <div className="text-center flex flex-col gap-2">
                  <div className=" flex justify-center">
                    <MdMovie size={40} className="text-secondary/80" />
                  </div>
                  <h3 className="text-[15px] text-secondary/80 mb-2">
                    Select a vlog or drag a file here
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
