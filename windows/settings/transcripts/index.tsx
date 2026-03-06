import { useState } from 'react'
import { VisibilityIcon, VisibilityOffIcon } from '../../shared/icons'
import { Subtitle, Title } from '../../shared/ui/macos-native'

interface Props {
  apiKey: string
  onApiKeyChange: (key: string) => void
  openaiApiKey: string
  onOpenaiApiKeyChange: (key: string) => void
}

export function TranscriptsSettings({
  apiKey,
  onApiKeyChange,
  openaiApiKey,
  onOpenaiApiKeyChange,
}: Props) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <Title htmlFor="apiKey">Gemini API Key</Title>
        <Subtitle>Used for AI summaries</Subtitle>
        <div className="flex gap-2 items-center">
          <input
            id="apiKey"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="native-input text-[14px] flex-1 h-8 bg-three border-none text-contrast focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-secondary hover:text-contrast transition-colors"
          >
            {showApiKey ? (
              <VisibilityOffIcon size={18} />
            ) : (
              <VisibilityIcon size={18} />
            )}
          </button>
        </div>
      </div>

      <div>
        <Title htmlFor="openaiApiKey">OpenAI API Key</Title>
        <Subtitle>Used for transcription</Subtitle>
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
