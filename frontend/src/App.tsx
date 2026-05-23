import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ChatPage } from './pages/ChatPage'
import { BotManagePage } from './pages/BotManagePage'
import { Sidebar } from './components/Sidebar'
import { RoleSettings } from './components/RoleSettings'
import { useState, useCallback } from 'react'

const DEFAULT_PROMPT = `You are Vertin, a Timekeeper from Reverse:1999. You help the user practice English conversation. Keep responses concise, natural, and in character. Correct grammar mistakes subtly.`

function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function MainLayout() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [difficulty, setDifficulty] = useState('intermediate')
  const [showSettings, setShowSettings] = useState(false)
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [convBotId, setConvBotId] = useState<number>(1) // default Vertin bot
  const { user, logout } = useAuth()

  const handleSelectConv = useCallback((id: number) => {
    setActiveConvId(id)
  }, [])

  const handleNewConv = useCallback((botId: number) => {
    setActiveConvId(null)
    setConvBotId(botId)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-100">Vertin · English Tutor</h1>
          <span className="text-xs text-zinc-500">{user?.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {showSettings ? 'Close' : 'Settings'}
          </button>
          <button
            onClick={logout}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <Sidebar
          activeConvId={activeConvId}
          onSelectConv={handleSelectConv}
          onNewConv={handleNewConv}
        />
        <div className="flex-1 flex overflow-hidden">
          {showSettings && (
            <aside className="w-80 border-r border-zinc-800 p-4 overflow-y-auto shrink-0">
              <RoleSettings
                systemPrompt={systemPrompt}
                difficulty={difficulty}
                onPromptChange={setSystemPrompt}
                onDifficultyChange={setDifficulty}
              />
            </aside>
          )}
          <div className="flex-1 overflow-auto">
            <Outlet context={{ activeConvId, convBotId, systemPrompt, difficulty }} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<ChatPage systemPrompt="" difficulty="" />} />
              <Route path="bots" element={<BotManagePage />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
