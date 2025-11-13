import React, { useEffect, useState } from 'react'
import { Button } from '../shared/ui/Button'

export function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [recordingsFolder, setRecordingsFolder] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const key = await window.electronAPI.getGeminiApiKey()
        setApiKey(key)

        const folder = await window.electronAPI.getRecordingsFolder()
        setRecordingsFolder(folder)
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault()
        window.electronAPI.hideSettingsWindow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSelectFolder = async () => {
    try {
      const selectedFolder = await window.electronAPI.openFolderPicker()
      if (selectedFolder) {
        setRecordingsFolder(selectedFolder)
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await window.electronAPI.setGeminiApiKey(apiKey)
      await window.electronAPI.setRecordingsFolder(recordingsFolder)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen bg-two/80 p-4">
      <h1 className="text-lg font-medium mb-8 text-contrast">Settings</h1>

      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-6">
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium mb-1 text-contrast"
            >
              Gemini API Key
            </label>
            <p className="text-xs text-secondary">
              Used for AI transcription features
            </p>
          </div>
          <div className="w-80">
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 text-sm rounded bg-three border-one text-contrast focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1 pr-6">
            <label
              htmlFor="recordingsFolder"
              className="block text-sm font-medium mb-1 text-contrast"
            >
              Recordings Folder
            </label>
            <p className="text-xs text-secondary">
              Where your recordings will be saved
            </p>
          </div>
          <div className="w-80">
            <div className="flex gap-2">
              <input
                id="recordingsFolder"
                type="text"
                value={recordingsFolder}
                readOnly
                placeholder="Select a folder"
                className="flex-1 px-3 py-2 text-sm rounded bg-three border-one text-contrast focus:outline-none"
              />
              <Button onClick={handleSelectFolder}>Browse</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim() || !recordingsFolder.trim()}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
