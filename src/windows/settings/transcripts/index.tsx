import { useEffect, useRef, useState } from 'react'
import { PasswordInput, Subtitle, Title } from '../../shared/ui/macos-native'

interface Props {
  onApiKeyChange: (hasKey: boolean) => void
}

export function TranscriptsSettings({ onApiKeyChange }: Props) {
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [userContext, setUserContext] = useState('')
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const loadSettings = async () => {
      const oaiKey = await window.electronAPI.getOpenaiApiKey()
      setOpenaiApiKey(oaiKey)
      onApiKeyChange(!!oaiKey)

      const context = await window.electronAPI.getUserContext()
      setUserContext(context)

      isInitialLoad.current = false
    }
    loadSettings()
  }, [onApiKeyChange])

  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      await window.electronAPI.setOpenaiApiKey(openaiApiKey)
      onApiKeyChange(!!openaiApiKey)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [openaiApiKey, onApiKeyChange])

  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    const timeoutId = setTimeout(async () => {
      await window.electronAPI.setUserContext(userContext)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [userContext])

  return (
    <div className="space-y-6">
      <div>
        <Title htmlFor="openaiApiKey">OpenAI API Key</Title>
        <Subtitle>Used to transcribe and summarize your logs.</Subtitle>
        <PasswordInput
          id="openaiApiKey"
          value={openaiApiKey}
          onChange={setOpenaiApiKey}
          placeholder="Enter your OpenAI API key"
        />
      </div>

      <div>
        <Title htmlFor="userContext">About you</Title>
        <Subtitle>Context will help AI generate better summaries.</Subtitle>
        <textarea
          id="userContext"
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          placeholder="Enter information about yourself, your role, interests, and context..."
          rows={8}
          className="w-full native-input text-[14px] min-h-[150px] py-2 leading-[1.3] bg-three border text-contrast placeholder:text-secondary"
        />
      </div>
    </div>
  )
}
