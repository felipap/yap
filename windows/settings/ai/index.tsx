import React from 'react'

interface Props {
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function AISettings({ apiKey, onApiKeyChange }: Props) {
  return (
    <div className="space-y-8">
      <div></div>
    </div>
  )
}
