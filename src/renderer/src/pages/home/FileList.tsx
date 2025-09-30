import { FileItem } from './FileItem'
import { RecordedFile } from '../../types'

interface FileListProps {
  files: RecordedFile[]
  onFileDeleted: () => void
  onFileWatch: (file: RecordedFile) => void
}

export function FileList({ files, onFileDeleted, onFileWatch }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="empty-state">
        <h3>No recordings yet</h3>
        <p>Start recording to see your vlogs here</p>
      </div>
    )
  }

  return (
    <div className="scroll-container">
      {files.map((file) => (
        <FileItem
          key={file.path}
          file={file}
          onDeleted={onFileDeleted}
          onWatch={onFileWatch}
        />
      ))}
    </div>
  )
}

