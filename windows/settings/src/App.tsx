import React, { useState, useEffect } from 'react'

export function App() {
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Load existing API key when component mounts
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
    setMessage('')

    try {
      await window.electronAPI.setGeminiApiKey(apiKey)
      setMessage('API key saved successfully!')
    } catch (error) {
      console.error('Failed to save API key:', error)
      setMessage('Failed to save API key. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Gemini API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {message && (
            <div
              className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}
            >
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </div>
    </div>
  )
}


