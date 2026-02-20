import { useState } from 'react'
import { MdFolder, MdShuffle, MdTextSnippet } from 'react-icons/md'
import { EnrichedLog } from '../../../../../../shared-types'
import {
  openFileLocation,
  openSummaryFile,
  openTranscriptionFile,
  shuffleThumbnail,
} from '../../../../../shared/ipc'
import { useDebugMode } from '../../../../../shared/useDebugMode'
import { Button } from '../../../../../shared/ui/Button'
import { JsonViewer } from '../../../../../shared/ui/JsonViewer'
import { ConvertButton } from './ConvertButton'
import { DeleteButton } from './DeleteButton'
import { MoveToDefaultFolderButton } from './MoveToDefaultFolderButton'

interface Props {
  log: EnrichedLog
  unselect: () => void
}

export function Toolbar({ log, unselect }: Props) {
  const debugMode = useDebugMode()
  const isWebm = log?.name?.toLowerCase().endsWith('.webm') || false
  const isMov = log?.name?.toLowerCase().endsWith('.mov') || false
  const inDefaultFolder = log?.isInDefaultFolder ?? true

  const [shuffling, setShuffling] = useState(false)

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(log.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleShuffleThumbnail = async () => {
    setShuffling(true)
    try {
      await shuffleThumbnail(log.id)
    } catch (error) {
      console.error('Failed to shuffle thumbnail:', error)
    } finally {
      setShuffling(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="no-drag-region flex flex-wrap gap-2 w-full  ">
        <Button onClick={handleOpenLocation}>
          <MdFolder size={16} />
          <span>Open Folder</span>
        </Button>
        {(isWebm || isMov) && <ConvertButton logId={log.id} />}
        {!inDefaultFolder && <MoveToDefaultFolderButton logId={log.id} />}
        <DeleteButton logId={log.id} onDeleted={unselect} />
        {debugMode && !log.isAudioOnly && (
          <Button onClick={handleShuffleThumbnail} disabled={shuffling}>
            <MdShuffle size={16} />
            <span>{shuffling ? 'Shuffling...' : 'Shuffle Thumbnail'}</span>
          </Button>
        )}
        {debugMode && (
          <Button onClick={() => openTranscriptionFile(log.id)}>
            <MdTextSnippet size={16} />
            <span>Open Transcription in Finder</span>
          </Button>
        )}
        {debugMode && (
          <Button onClick={() => openSummaryFile(log.id)}>
            <MdTextSnippet size={16} />
            <span>Open Summary in Finder</span>
          </Button>
        )}
      </div>
      {debugMode && <JsonViewer log={log} />}
    </div>
  )
}
