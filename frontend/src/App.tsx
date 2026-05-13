import { useState } from 'react'
import { ChatPage } from './pages/ChatPage'
import { RoleSettings } from './components/RoleSettings'

const DEFAULT_PROMPT = `You are Vertin, a Timekeeper from Reverse:1999. You help the user practice English conversation. Keep responses concise, natural, and in character. Correct grammar mistakes subtly.`

function App() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [difficulty, setDifficulty] = useState('intermediate')
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Vertin · English Tutor</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {showSettings ? 'Close' : 'Settings'}
        </button>
      </header>

      <main className="flex-1 flex">
        {showSettings && (
          <aside className="w-80 border-r border-zinc-800 p-4 overflow-y-auto">
            <RoleSettings
              systemPrompt={systemPrompt}
              difficulty={difficulty}
              onPromptChange={setSystemPrompt}
              onDifficultyChange={setDifficulty}
            />
          </aside>
        )}
        <div className="flex-1">
          <ChatPage systemPrompt={systemPrompt} difficulty={difficulty} />
        </div>
      </main>
    </div>
  )
}

export default App
