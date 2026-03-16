import { useEffect, useRef, useState } from 'react'
import { MacOsButton, Subtitle, Title } from '../../shared/ui/macos-native'

export function GeneralSettings() {
  const [recordingsFolder, setRecordingsFolder] = useState('')
  const [sentryEnabled, setSentryEnabled] = useState(true)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const loadSettings = async () => {
      const folder = await window.electronAPI.getRecordingsFolder()
      setRecordingsFolder(folder)

      const sentry = await window.electronAPI.getSentryEnabled()
      setSentryEnabled(sentry)

      isInitialLoad.current = false
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      await window.electronAPI.setPartialState({ recordingsFolder })
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [recordingsFolder])

  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      await window.electronAPI.setSentryEnabled(sentryEnabled)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [sentryEnabled])

  const handleSelectFolder = async () => {
    const selectedFolder = await window.electronAPI.openFolderPicker()
    if (selectedFolder) {
      setRecordingsFolder(selectedFolder)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Title htmlFor="recordingsFolder">Recordings Folder</Title>
        <Subtitle>Where your recordings will be saved</Subtitle>
        <div className="flex gap-2">
          <input
            id="recordingsFolder"
            type="text"
            value={recordingsFolder}
            readOnly
            placeholder="Select a folder"
            className="native-input text-[14px] flex-1 h-8 bg-three border-none text-contrast focus:outline-none"
          />
          <MacOsButton onClick={handleSelectFolder}>Browse</MacOsButton>
        </div>
      </div>

      <div>
        <Title>Error Reporting</Title>
        <Subtitle>When the app crashes, send anonymous error reports.</Subtitle>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sentryEnabled}
            onChange={(e) => setSentryEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-highlight focus:ring-highlight cursor-pointer"
          />
          <span className="text-sm text-contrast">
            Send anonymous error reports
          </span>
        </label>
      </div>
    </div>
  )
}
