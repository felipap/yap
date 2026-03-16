import { useState } from 'react'
import { VisibilityIcon, VisibilityOffIcon } from '../../shared/icons'
import { Subtitle, Title } from '../../shared/ui/macos-native'

interface Props {
  openaiApiKey: string
  onOpenaiApiKeyChange: (key: string) => void
  userContext: string
  onUserContextChange: (context: string) => void
}

export function TranscriptsSettings({
  openaiApiKey,
  onOpenaiApiKeyChange,
  userContext,
  onUserContextChange,
}: Props) {
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <Title htmlFor="userContext">About you</Title>
        <Subtitle>Context will help AI generate better summaries.</Subtitle>
        <textarea
          id="userContext"
          value={userContext}
          onChange={(e) => onUserContextChange(e.target.value)}
          placeholder="Enter information about yourself, your role, interests, and context..."
          rows={8}
          className="w-full native-input text-[14px] min-h-[150px] py-2 leading-[1.3] bg-three border text-contrast placeholder:text-secondary"
        />
      </div>

      <div>
        <Title htmlFor="openaiApiKey">OpenAI API Key</Title>
        <Subtitle>Used for transcription and summaries</Subtitle>
        <div className="flex gap-2 items-center">
          <input
            id="openaiApiKey"
            type={showOpenaiKey ? 'text' : 'password'}
            value={openaiApiKey}
            onChange={(e) => onOpenaiApiKeyChange(e.target.value)}
            placeholder="Enter your OpenAI API key"
            className="native-input text-[14px] flex-1 h-8 bg-three border-none text-contrast focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
            className="text-secondary hover:text-contrast transition-colors"
          >
            {showOpenaiKey ? (
              <VisibilityOffIcon size={18} />
            ) : (
              <VisibilityIcon size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
