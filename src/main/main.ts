import { app, BrowserWindow, ipcMain, desktopCapturer, shell } from 'electron'
import { join } from 'path'
import { readdir, stat, writeFile, mkdir, unlink } from 'fs/promises'
import { homedir } from 'os'

let mainWindow: BrowserWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active'
  })

  // Load from localhost in development
  mainWindow.loadURL('http://localhost:3000')
  mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window']
    })
    return sources
  } catch (error) {
    console.error('Error getting screen sources:', error)
    throw error
  }
})

ipcMain.handle('get-recorded-files', async () => {
  try {
    const documentsPath = join(homedir(), 'Documents', 'VlogRecordings')

    // Create directory if it doesn't exist
    await mkdir(documentsPath, { recursive: true })

    const files = await readdir(documentsPath)

    const fileStats = await Promise.all(
      files
        .filter(file => file.endsWith('.mp4') || file.endsWith('.webm'))
        .map(async (file) => {
          const filePath = join(documentsPath, file)
          const stats = await stat(filePath)
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          }
        })
    )

    return fileStats.sort((a, b) => b.created.getTime() - a.created.getTime())
  } catch (error) {
    console.error('Error getting recorded files:', error)
    return []
  }
})

ipcMain.handle('open-file-location', async (_, filePath: string) => {
  try {
    await shell.showItemInFolder(filePath)
  } catch (error) {
    console.error('Error opening file location:', error)
    throw error
  }
})

ipcMain.handle('delete-file', async (_, filePath: string) => {
  try {
    await unlink(filePath)
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
})

ipcMain.handle('save-recording', async (_, filename: string, arrayBuffer: ArrayBuffer) => {
  try {
    const recordingsDir = join(homedir(), 'Documents', 'VlogRecordings')
    await mkdir(recordingsDir, { recursive: true })

    const filepath = join(recordingsDir, filename)
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filepath, buffer)

    console.log(`Recording saved: ${filepath}`)
    return filepath
  } catch (error) {
    console.error('Error saving recording:', error)
    throw error
  }
})
