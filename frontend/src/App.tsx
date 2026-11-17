import React from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ChatPage } from '@/pages/ChatPage'

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ChatPage />
    </ErrorBoundary>
  )
}

export default App
