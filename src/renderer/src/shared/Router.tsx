import { createContext, useContext, useState, ReactNode } from 'react'

type Route =
  | { name: 'library' }
  | { name: 'record' }

interface RouterContextType {
  currentRoute: Route
  navigate: (route: Route) => void
  goBack: () => void
}

const RouterContext = createContext<RouterContextType | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<Route>({ name: 'library' })
  const [history, setHistory] = useState<Route[]>([{ name: 'library' }])

  const navigate = (route: Route) => {
    setHistory(prev => [...prev, route])
    setCurrentRoute(route)
  }

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1)
      setHistory(newHistory)
      setCurrentRoute(newHistory[newHistory.length - 1])
    }
  }

  return (
    <RouterContext.Provider value={{ currentRoute, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider')
  }
  return context
}

