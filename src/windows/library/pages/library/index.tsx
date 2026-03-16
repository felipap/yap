import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { MovieIcon } from '~/shared/icons'
import { useLog } from '~/shared/useLog'
import { SidebarLog } from '../../types'
import { DetailPage } from './DetailPage'
import { DragDropWrapper } from './DragDropWrapper'
import { Sidebar } from './Sidebar'

export default function Page() {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const { log } = useLog(selectedLogId)

  function handleSelectLog(next: SidebarLog) {
    setSelectedLogId(next.id)
  }

  let main
  if (log) {
    main = (
      <DetailPage
        key={log.id}
        log={log}
        unselect={() => {
          setSelectedLogId(null)
        }}
      />
    )
  } else {
    main = <NoVideoPage />
  }

  return (
    <DragDropWrapper>
      <div
        className={twMerge(
          'flex flex-1 h-full w-screen',
          'bg-one',
          'overflow-hidden gap-2 pl-2 pr-1.5 pb-2',
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="drag-region h-(--nav-height) bg-one shrink-0" />
          <div className="flex-1 min-h-0 overflow-hidden">
            <Sidebar
              selectedLog={log ?? null}
              onSelect={handleSelectLog}
              unselect={() => setSelectedLogId(null)}
            />
          </div>
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
    <div className="flex-1 flex items-center justify-center select-none drag-region">
      <div className="text-center flex flex-col gap-2">
        <div className=" flex justify-center">
          <MovieIcon size={40} className="text-secondary/80" />
        </div>
        <h3 className="text-md text-secondary/60">
          Click an entry or drag a file to import
        </h3>
      </div>
    </div>
  )
}
