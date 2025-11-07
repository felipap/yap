import { useEffect, useState } from 'react'
import { Button } from '../shared/ui/Button'

export function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await window.electronAPI.getGeminiApiKey()
        setApiKey(key)
      } catch (error) {
        console.error('Failed to load API key:', error)
      }
    }
    loadApiKey()
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await window.electronAPI.setGeminiApiKey(apiKey)
    } catch (error) {
      console.error('Failed to save API key:', error)
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
      </div>

      <div className="mt-12 flex justify-end">
        <Button onClick={handleSave} disabled={isLoading || !apiKey.trim()}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
