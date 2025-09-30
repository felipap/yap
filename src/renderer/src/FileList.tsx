import React from 'react'
import { FileItem } from './FileItem'

interface RecordedFile {
  name: string
  path: string
  size: number
  created: Date
  modified: Date
}

interface FileListProps {
  files: RecordedFile[]
  onFileDeleted: () => void
}

export function FileList({ files, onFileDeleted }: FileListProps) {
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
        />
      ))}
    </div>
  )
}

