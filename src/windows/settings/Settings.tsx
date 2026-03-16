import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { MacOsButton } from '../shared/ui/macos-native'
import { GeneralSettings } from './general'
import { TranscriptsSettings } from './transcripts'

const TABS = ['general', 'transcripts']

export function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [recordingsFolder, setRecordingsFolder] = useState('')
  const [userContext, setUserContext] = useState('')
  const [sentryEnabled, setSentryEnabled] = useState(true)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
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
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasTranscriptWarning={!openaiApiKey}
      />

      <div className="min-h-[calc(100vh-85px)] mt-[-12px] py-4 px-[20px] bg-[#F7F7F7] dark:bg-[#323333] border border-[#ECECEC] dark:border-[#4B4B4B] rounded-2xl flex flex-col">
        {activeTab === 'general' && (
          <GeneralSettings
            recordingsFolder={recordingsFolder}
            onRecordingsFolderChange={setRecordingsFolder}
            sentryEnabled={sentryEnabled}
            onSentryEnabledChange={setSentryEnabled}
          />
        )}

        {activeTab === 'transcripts' && (
          <TranscriptsSettings
            openaiApiKey={openaiApiKey}
            onOpenaiApiKeyChange={setOpenaiApiKey}
            userContext={userContext}
            onUserContextChange={setUserContext}
          />
        )}

        <div className="mt-auto pt-4">
          <MacOsButton onClick={() => {}}>Save</MacOsButton>
        </div>
      </div>
    </div>
  )
}

interface Props {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
  hasTranscriptWarning: boolean
}

export function Tabs({ tabs, activeTab, onTabChange, hasTranscriptWarning }: Props) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex bg-neutral-200 dark:bg-neutral-700 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={twMerge(
              'px-4 h-[24px] text-sm font-medium antialiased font-text text-[13px] rounded-md transition-all flex items-center gap-1.5',
              activeTab === tab
                ? 'bg-highlight text-white dark:text-white'
                : 'text-secondary hover:text-contrast',
            )}
          >
            {tab === 'transcripts' && hasTranscriptWarning && (
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
            )}
            {tab === 'general' ? 'General' : 'Transcripts'}
          </button>
        ))}
      </div>
    </div>
  )
}
