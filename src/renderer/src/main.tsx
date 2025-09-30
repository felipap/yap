import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { RouterProvider } from './shared/Router'

import './shared/global.css'
import './shared/css/tailwind.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </React.StrictMode>
)
