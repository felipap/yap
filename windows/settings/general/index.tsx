import { MacOsButton, Subtitle, Title } from '../../shared/ui/macos-native'

interface Props {
  recordingsFolder: string
  onRecordingsFolderChange: (folder: string) => void
  userContext: string
  onUserContextChange: (context: string) => void
  sentryEnabled: boolean
  onSentryEnabledChange: (enabled: boolean) => void
}

export function GeneralSettings({
  recordingsFolder,
  onRecordingsFolderChange,
  userContext,
  onUserContextChange,
  sentryEnabled,
  onSentryEnabledChange,
}: Props) {
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
        <Title>Error Reporting</Title>
        <Subtitle>
          Help improve Yap by sending anonymous crash reports (requires restart)
        </Subtitle>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sentryEnabled}
            onChange={(e) => onSentryEnabledChange(e.target.checked)}
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
