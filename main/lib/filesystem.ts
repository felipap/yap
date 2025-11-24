import { shell } from 'electron'
import { access } from 'fs/promises'

/**
 * Moves a file to the system trash instead of permanently deleting it.
 * This is safer than using unlink() as it allows users to recover files.
 */
export async function moveToTrash(filePath: string): Promise<void> {
  await shell.trashItem(filePath)
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}
