import { store } from '../store'
import { libraryWindow } from './library'

// Handle top-level page changes - resizes the library window for the record view
export function onChangeTopLevelPage(page: 'library' | 'record'): void {
  if (!libraryWindow) {
    return
  }

  if (page === 'record') {
    // Save current bounds before resizing
    const currentBounds = libraryWindow.getBounds()
    store.set('previousWindowBounds', currentBounds)

    // Set fixed size for record view
    libraryWindow.setMinimumSize(800, 600)
    libraryWindow.setMaximumSize(800, 800)
    // libraryWindow.setSize(800, 600)
    // libraryWindow.center()
  } else {
    // Restore previous bounds
    const previousBounds = store.get('previousWindowBounds') as {
      width: number
      height: number
    } | null

    // Restore min/max constraints to library window defaults
    libraryWindow.setMinimumSize(800, 500)
    libraryWindow.setMaximumSize(800, 1000)

    // Restore only the size, keeping the current window position
    // (user may have moved the window while recording)
    if (previousBounds) {
      libraryWindow.setSize(previousBounds.width, previousBounds.height)
    } else {
      // Fallback to default library size
      libraryWindow.setSize(800, 500)
    }
  }
}
