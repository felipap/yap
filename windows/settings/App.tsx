import { useEffect, useState } from 'react'

function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <h2 className="text-lg font-medium text-red-800 mb-2">
        Something went wrong:
      </h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button
        onClick={onRetry}
        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  )
}

function SettingsForm() {
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    // Load existing API key when component mounts
    const loadApiKey = async () => {
      try {
        setError(null)
        const key = await window.electronAPI.getGeminiApiKey()
        setApiKey(key)
      } catch (error) {
        console.error('Failed to load API key:', error)
        setError(error as Error)
      }
    }

    loadApiKey()
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    setMessage('')
    setError(null)

    try {
      await window.electronAPI.setGeminiApiKey(apiKey)
      setMessage('API key saved successfully!')
    } catch (error) {
      console.error('Failed to save API key:', error)
      setError(error as Error)
      setMessage('Failed to save API key. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setMessage('')
  }

  const handleClear = () => {
    setApiKey('')
    setMessage('')
    setError(null)
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={handleRetry} />
  }

  return (
    <div className="space-y-6">
      {/* API Key Section */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Gemini API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally and never shared.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isLoading || !apiKey.trim()}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </button>
          <button
            onClick={handleClear}
            disabled={isLoading || !apiKey.trim()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={`text-sm p-3 rounded-md ${
            message.includes('success')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Help Section */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Need help?</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Get your API key from the Google AI Studio</p>
          <p>
            • Make sure you have billing enabled on your Google Cloud account
          </p>
          <p>• The API key is used for AI-powered transcription features</p>
        </div>
      </div>
    </div>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure your application preferences
          </p>
        </div>

        <SettingsForm />
      </div>
    </div>
  )
}
