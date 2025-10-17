import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

interface DownloadProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Listen for update events
    const handleUpdateAvailable = (info: UpdateInfo) => {
      setUpdateInfo(info)
      setIsVisible(true)
    }

    const handleDownloadProgress = (progress: DownloadProgress) => {
      setDownloadProgress(progress)
      setIsDownloading(true)
    }

    const handleUpdateDownloaded = (info: UpdateInfo) => {
      setIsDownloading(false)
      setIsDownloaded(true)
      setDownloadProgress(null)
    }

    // Set up event listeners
    window.electronAPI.onUpdateAvailable(handleUpdateAvailable)
    window.electronAPI.onDownloadProgress(handleDownloadProgress)
    window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded)

    // Cleanup
    return () => {
      window.electronAPI.removeUpdateListeners()
    }
  }, [])

  const handleDownload = async () => {
    try {
      await window.electronAPI.downloadUpdate()
    } catch (error) {
      console.error('Error downloading update:', error)
    }
  }

  const handleInstall = async () => {
    try {
      await window.electronAPI.installUpdate()
    } catch (error) {
      console.error('Error installing update:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible || !updateInfo) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-lg">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5" />
          <div>
            <div className="font-medium">
              {isDownloaded ? 'Update Ready!' : 'Update Available'}
            </div>
            <div className="text-sm opacity-90">
              Version {updateInfo.version} is available
            </div>
            {isDownloading && downloadProgress && (
              <div className="text-sm opacity-90">
                Downloading... {Math.round(downloadProgress.percent)}%
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isDownloaded && !isDownloading && (
            <button
              onClick={handleDownload}
              className="px-3 py-1 bg-white text-blue-600 rounded text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          
          {isDownloaded && (
            <button
              onClick={handleInstall}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Install & Restart
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {isDownloading && downloadProgress && (
        <div className="mt-2">
          <div className="w-full bg-white/20 rounded-full h-1">
            <div
              className="bg-white h-1 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}


