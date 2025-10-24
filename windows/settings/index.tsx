import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { App } from './App'

import '../shared/css/tailwind.css'

function SettingsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={(props) => (
        <div className="p-4 pt-10 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2">
          Settings window error: {props.error.message}
          <pre className="text-[12px] bg-red-50 border border-red-200 rounded-lg p-2 overflow-auto max-h-[200px] font-mono text-red-600">
            {props.error.stack}
          </pre>
          <button
            onClick={() => {
              window.location.reload()
            }}
            className="border px-2 py-1 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            Reload
          </button>
        </div>
      )}
      onError={(error) => {
        console.error('Settings ErrorBoundary caught an error:', error)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* <SettingsErrorBoundary>
    </SettingsErrorBoundary> */}
  </React.StrictMode>,
)
