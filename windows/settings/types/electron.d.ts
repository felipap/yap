interface ElectronAPI {
  getGeminiApiKey: () => Promise<string>
  setGeminiApiKey: (apiKey: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}


