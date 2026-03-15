import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { MacOsButton } from '../shared/ui/macos-native'
import { GeneralSettings } from './general'
import { TranscriptsSettings } from './transcripts'

const TABS = ['general', 'transcripts']

export function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [apiKey, setApiKey] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [recordingsFolder, setRecordingsFolder] = useState('')
  const [userContext, setUserContext] = useState('')
  const [sentryEnabled, setSentryEnabled] = useState(true)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const key = await window.electronAPI.getGeminiApiKey()
        setApiKey(key)

        const oaiKey = await window.electronAPI.getOpenaiApiKey()
        setOpenaiApiKey(oaiKey)

        const folder = await window.electronAPI.getRecordingsFolder()
        setRecordingsFolder(folder)

        const context = await window.electronAPI.getUserContext()
        setUserContext(context)

        const sentry = await window.electronAPI.getSentryEnabled()
        setSentryEnabled(sentry)
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

  // Autosave OpenAI API key
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        await window.electronAPI.setOpenaiApiKey(openaiApiKey)
      } catch (error) {
        console.error('Failed to autosave OpenAI API key:', error)
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [openaiApiKey])

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

  // Autosave Sentry enabled
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        await window.electronAPI.setSentryEnabled(sentryEnabled)
      } catch (error) {
        console.error('Failed to autosave Sentry setting:', error)
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [sentryEnabled])

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

  return (
    <div className="min-h-screen select-none dark:bg-[#2B2C2C] bg-[#FFF] py-5 px-[16px]">
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="min-h-[calc(100vh-85px)] mt-[-12px] py-4 px-[20px] bg-[#F7F7F7] dark:bg-[#323333] border border-[#ECECEC] dark:border-[#4B4B4B] rounded-2xl">
        {activeTab === 'general' && (
          <GeneralSettings
            recordingsFolder={recordingsFolder}
            onRecordingsFolderChange={setRecordingsFolder}
            userContext={userContext}
            onUserContextChange={setUserContext}
            sentryEnabled={sentryEnabled}
            onSentryEnabledChange={setSentryEnabled}
          />
        )}

        {activeTab === 'transcripts' && (
          <TranscriptsSettings
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            openaiApiKey={openaiApiKey}
            onOpenaiApiKeyChange={setOpenaiApiKey}
          />
        )}
      </div>

      <footer className="mt-3">
        <MacOsButton onClick={() => {}}>Save</MacOsButton>
      </footer>
    </div>
  )
}

interface Props {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Tabs({ tabs, activeTab, onTabChange }: Props) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex bg-neutral-200 dark:bg-neutral-700 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={twMerge(
              'px-4 h-[24px] text-sm font-medium antialiased font-text text-[13px] rounded-md transition-all',
              activeTab === tab
                ? // ? 'bg-white dark:bg-neutral-600 text-contrast shadow-sm'
                  'bg-highlight text-white dark:text-white'
                : 'text-secondary hover:text-contrast',
            )}
          >
            {tab === 'general' ? 'General' : 'Transcripts'}
          </button>
        ))}
      </div>
    </div>
  )
}
