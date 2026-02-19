import { useState } from 'react'
import { VisibilityIcon, VisibilityOffIcon } from '../../shared/icons'
import { MacOsButton, Subtitle, Title } from '../../shared/ui/macos-native'

interface Props {
  recordingsFolder: string
  onRecordingsFolderChange: (folder: string) => void
  userContext: string
  onUserContextChange: (context: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
  openaiApiKey: string
  onOpenaiApiKeyChange: (key: string) => void
}

export function GeneralSettings({
  recordingsFolder,
  onRecordingsFolderChange,
  userContext,
  onUserContextChange,
  apiKey,
  onApiKeyChange,
  openaiApiKey,
  onOpenaiApiKeyChange,
}: Props) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  const handleSelectFolder = async () => {
    const selectedFolder = await window.electronAPI.openFolderPicker()
    if (selectedFolder) {
      onRecordingsFolderChange(selectedFolder)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Title htmlFor="userContext">About you</Title>
        <Subtitle>Context to help AI generate better summaries</Subtitle>
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
