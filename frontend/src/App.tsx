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
  const [convBotId, setConvBotId] = useState<number>(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()

  const handleSelectConv = useCallback((id: number) => {
    setActiveConvId(id)
    setSidebarOpen(false)
  }, [])

  const handleNewConv = useCallback((botId: number) => {
    setActiveConvId(null)
    setConvBotId(botId)
    setSidebarOpen(false)
  }, [])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1 -ml-1 text-zinc-400 hover:text-zinc-200"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base md:text-lg font-semibold text-zinc-100">Vertin · English Tutor</h1>
          <span className="hidden sm:inline text-xs text-zinc-500">{user?.email}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {showSettings ? '关闭设置' : '设置'}
          </button>
          <button
            onClick={logout}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Desktop sidebar — always visible */}
        <div className="hidden md:block w-64 shrink-0">
          <Sidebar
            activeConvId={activeConvId}
            activeBotId={convBotId}
            onSelectConv={handleSelectConv}
            onNewConv={handleNewConv}
          />
        </div>

        {/* Mobile sidebar — slide-in overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeSidebar}
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] animate-slide-in">
              <Sidebar
                activeConvId={activeConvId}
                activeBotId={convBotId}
                onSelectConv={handleSelectConv}
                onNewConv={handleNewConv}
                onClose={closeSidebar}
              />
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop settings — inline aside */}
          {showSettings && (
            <aside className="hidden md:block w-80 border-r border-zinc-800 p-4 overflow-y-auto shrink-0">
              <RoleSettings
                systemPrompt={systemPrompt}
                difficulty={difficulty}
                onPromptChange={setSystemPrompt}
                onDifficultyChange={setDifficulty}
              />
            </aside>
          )}

          {/* Mobile settings — fullscreen overlay */}
          {showSettings && (
            <div className="md:hidden fixed inset-0 z-50 bg-zinc-950 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                <h2 className="text-lg font-semibold text-zinc-100">设置</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-sm text-zinc-400 hover:text-zinc-200 p-1"
                >
                  关闭
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <RoleSettings
                  systemPrompt={systemPrompt}
                  difficulty={difficulty}
                  onPromptChange={setSystemPrompt}
                  onDifficultyChange={setDifficulty}
                />
              </div>
            </div>
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
