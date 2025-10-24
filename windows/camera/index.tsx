import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '../shared/Router'
import { App } from '../library/App'

function Indicator() {
  return <div id="status">Recording...</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Indicator />
  </React.StrictMode>,
)
