import { MdFolder } from 'react-icons/md'
import { EnrichedLog } from '../../../../../../shared-types'
import { openFileLocation } from '../../../../../shared/ipc'
import { Button } from '../../../../../shared/ui/Button'
import { JsonViewer } from '../../../../../shared/ui/JsonViewer'
import { ConvertButton } from './ConvertButton'
import { DeleteButton } from './DeleteButton'
import { MoveToDefaultFolderButton } from './MoveToDefaultFolderButton'
import { IS_DEV } from '../../../..'

interface Props {
  log: EnrichedLog
  onBack: () => void
}

export function Toolbar({ log, onBack }: Props) {
  const isWebm = log?.name?.toLowerCase().endsWith('.webm') || false
  const isMov = log?.name?.toLowerCase().endsWith('.mov') || false
  const inDefaultFolder = log?.isInDefaultFolder ?? true

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(log.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="no-drag-region flex gap-2 w-full  overflow-x-scroll">
        <Button onClick={handleOpenLocation}>
          <MdFolder size={16} />
          <span>Show in Finder</span>
        </Button>
        {(isWebm || isMov) && <ConvertButton logId={log.id} />}
        {!inDefaultFolder && <MoveToDefaultFolderButton logId={log.id} />}
        <DeleteButton logId={log.id} onDeleted={onBack} />
      </div>
      {IS_DEV && <JsonViewer log={log} />}
    </div>
  )
}
