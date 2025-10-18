import { useState, useEffect } from 'react'
import { Button } from './components/Button'

export function App() {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const apiKey = await window.electronAPI.getGeminiApiKey()
      setGeminiApiKey(apiKey || '')
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage('Error loading settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setMessage('')

      await window.electronAPI.setGeminiApiKey(geminiApiKey)
      setMessage('Settings saved successfully!')

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setGeminiApiKey('')
    setMessage('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="gemini-api-key"
            className="block text-sm font-medium mb-2"
          >
            Gemini API Key
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Enter your Google Gemini API key to enable AI-powered features like
            video summaries.
          </p>
          <input
            id="gemini-api-key"
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally and never shared.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-md ${
              message.includes('Error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>

          <Button
            onClick={handleReset}
            variant="secondary"
            className="px-4 py-2"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
