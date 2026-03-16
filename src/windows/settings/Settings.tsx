import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { GeneralSettings } from './general'
import { TranscriptsSettings } from './transcripts'

const TABS = ['general', 'transcripts']

export function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [hasTranscriptWarning, setHasTranscriptWarning] = useState(false)

  useEffect(() => {
    async function checkApiKey() {
      const key = await window.electronAPI.getOpenaiApiKey()
      setHasTranscriptWarning(!key)
    }
    checkApiKey()
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

  return (
    <div className="min-h-screen select-none dark:bg-[#2B2C2C] bg-[#FFF] py-5 px-[16px]">
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasTranscriptWarning={hasTranscriptWarning}
      />

      <div className="min-h-[calc(100vh-55px)] mt-[-12px] py-4 pt-6 px-[16px] bg-[#F7F7F7] dark:bg-[#323333] border border-[#ECECEC] dark:border-[#4B4B4B] rounded-2xl flex flex-col">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'transcripts' && (
          <TranscriptsSettings
            onApiKeyChange={(hasKey) => setHasTranscriptWarning(!hasKey)}
          />
        )}
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

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  hasTranscriptWarning,
}: Props) {
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
