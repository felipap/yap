import { useEffect, useState } from 'react'
import { PlaybackPreferencesProvider } from '../../../shared/PlaybackPreferencesProvider'
import { MovieIcon } from '../../../shared/icons'
import { useLog } from '../../../shared/useLogData'
import { EnrichedLog } from '../../types'
import { DetailPage } from './detail'
import { DragDropWrapper } from './DragDropWrapper'
import { Sidebar } from './Sidebar'

export default function Page() {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const { log } = useLog(selectedLogId)

  function handleSelectLog(next: EnrichedLog) {
    setSelectedLogId(next.id)
  }

  useEffect(() => {
    console.log('useEffect')
  }, [])

  let main
  if (log) {
    main = (
      <PlaybackPreferencesProvider>
        <DetailPage
          key={log.id}
          log={log}
          onBack={() => setSelectedLogId(null)}
        />
      </PlaybackPreferencesProvider>
    )
  } else {
    main = <NoVideoPage />
  }

  return (
    <DragDropWrapper>
      <div className="flex h-full w-screen overflow-hidden bg-one gap-2 pl-2 pr-1.5 pb-2">
        <div className="h-full bg-sidebar rounded-md">
          <Sidebar
            selectedLog={log ?? null}
            onVideoSelect={handleSelectLog}
            onClose={() => setSelectedLogId(null)}
          />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden rounded-md">
          {main}
        </div>
      </div>
    </DragDropWrapper>
  )
}

function NoVideoPage() {
  return (
    <div className="flex-1 flex items-center justify-center select-none">
      <div className="text-center flex flex-col gap-2">
        <div className=" flex justify-center">
          <MovieIcon size={40} className="text-secondary/80" />
        </div>
        <h3 className="text-md text-secondary/60">
          Select a log or drag a file to import
        </h3>
      </div>
    </div>
  )
}
