import React, { useEffect, useState, useRef } from 'react'
import { Button } from '../shared/ui/Button'

export function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [recordingsFolder, setRecordingsFolder] = useState('')
  const [userContext, setUserContext] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const key = await window.electronAPI.getGeminiApiKey()
        setApiKey(key)

        const folder = await window.electronAPI.getRecordingsFolder()
        setRecordingsFolder(folder)

        const context = await window.electronAPI.getUserContext()
        setUserContext(context)
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        isInitialLoad.current = false
      }
    }
    loadSettings()
  }, [])

  // Autosave user context
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        await window.electronAPI.setUserContext(userContext)
      } catch (error) {
        console.error('Failed to autosave user context:', error)
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [userContext])

  // Autosave Gemini API key
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        await window.electronAPI.setGeminiApiKey(apiKey)
      } catch (error) {
        console.error('Failed to autosave API key:', error)
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [apiKey])

  // Autosave recordings folder
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        await window.electronAPI.setPartialState({ recordingsFolder })
      } catch (error) {
        console.error('Failed to autosave recordings folder:', error)
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [recordingsFolder])

  // When cmd+, is pressed, hide the settings window
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
      await window.electronAPI.setPartialState({ recordingsFolder })
      await window.electronAPI.setUserContext(userContext)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-one p-4 track-10 dark:antialiased">
      <div className="space-y-8">
        <div>
          <label
            htmlFor="userContext"
            className="block text-md font-medium mb-1 text-contrast"
          >
            About you
          </label>
          <p className="text-sm track-20 text-secondary mb-2">
            Context to help AI generate better summaries
          </p>
          <textarea
            id="userContext"
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
            placeholder="Enter information about yourself, your role, interests, and context..."
            rows={6}
            className="w-full px-3 py-2 text-md rounded leading-[1.4] bg-three border text-contrast focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-secondary"
          />
        </div>

        <div>
          <label
            htmlFor="apiKey"
            className="block text-md font-medium mb-1 text-contrast"
          >
            Gemini API Key
          </label>
          <p className="text-sm track-20 text-secondary mb-2">
            Used for AI transcription features
          </p>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="w-full h-8 text-md rounded bg-three border-none text-contrast focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="recordingsFolder"
            className="block text-md font-medium mb-1 text-contrast"
          >
            Recordings Folder
          </label>
          <p className="text-sm track-20 text-secondary mb-2">
            Where your recordings will be saved
          </p>
          <div className="flex gap-2">
            <input
              id="recordingsFolder"
              type="text"
              value={recordingsFolder}
              readOnly
              placeholder="Select a folder"
              className="flex-1 h-8 text-md rounded bg-three border-none text-contrast focus:outline-none"
            />
            <Button onClick={handleSelectFolder}>Browse</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
