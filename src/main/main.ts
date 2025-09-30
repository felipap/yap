import { app, BrowserWindow, ipcMain, desktopCapturer, shell, protocol } from 'electron'
import { join } from 'path'
import { readdir, stat, writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { homedir } from 'os'
import { store } from './store'

// Register the custom protocol as a standard scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vlog-video',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
      stream: true
    }
  }
])

let mainWindow: BrowserWindow

function createWindow() {
  const windowBounds = store.get('windowBounds', { width: 1200, height: 800 })

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active'
  })

  // Save window bounds on close
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', bounds)
  })

  // Load from localhost in development
  mainWindow.loadURL('http://localhost:3000')
  mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  // Register custom protocol to serve local video files
  protocol.handle('vlog-video', async (request) => {
    try {
      // Remove the protocol and decode the URL
      let filePath = request.url.replace('vlog-video://', '')
      filePath = decodeURIComponent(filePath)

      console.log('Video request URL:', request.url)
      console.log('Decoded file path:', filePath)

      const data = await readFile('/' + filePath)

      // Determine MIME type based on file extension
      const mimeType = filePath.endsWith('.webm') ? 'video/webm' : 'video/mp4'

      console.log('Successfully loaded video:', filePath, 'Size:', data.length, 'bytes')

      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': data.length.toString()
        }
      })
    } catch (error) {
      console.error('Error loading video file:', error)
      console.error('Request URL:', request.url)
      return new Response('File not found', { status: 404 })
    }
  })

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

// Store handlers
ipcMain.handle('store-get', (_, key: string) => {
  return store.get(key)
})

ipcMain.handle('store-set', (_, key: string, value: any) => {
  store.set(key, value)
})

ipcMain.handle('store-get-all', () => {
  return store.store
})
