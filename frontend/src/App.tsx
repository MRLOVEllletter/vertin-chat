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
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <p className="font-body text-ink-pale text-lg">Loading...</p>
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
    <div className="h-screen flex flex-col bg-cream-100">
      {/* ===== HEADER ===== */}
      <header className="bg-paper border-b border-cream-300 shrink-0 z-30">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 text-ink-pale hover:text-ink transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-display text-lg md:text-xl text-navy tracking-wide">Vertin</h1>
            <span className="hidden sm:inline font-body text-sm text-ink-pale">英语陪练</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline font-body text-xs text-ink-pale">{user?.email}</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="font-body text-sm text-navy-pale hover:text-navy transition-colors"
            >
              {showSettings ? '关闭' : '设置'}
            </button>
            <button
              onClick={logout}
              className="font-body text-sm text-ink-pale hover:text-ink transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 shrink-0 border-r border-cream-300 bg-cream-200">
          <Sidebar
            activeConvId={activeConvId}
            activeBotId={convBotId}
            onSelectConv={handleSelectConv}
            onNewConv={handleNewConv}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={closeSidebar}
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-cream-200 shadow-xl">
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

        {/* Content area + settings */}
        <div className="flex-1 flex overflow-hidden">
          {/* Settings panel (desktop) */}
          {showSettings && (
            <aside className="hidden md:block w-80 border-r border-cream-300 bg-cream-200 p-5 overflow-y-auto shrink-0">
              <h2 className="font-display text-sm text-navy tracking-wide mb-4">设置</h2>
              <RoleSettings
                systemPrompt={systemPrompt}
                difficulty={difficulty}
                onPromptChange={setSystemPrompt}
                onDifficultyChange={setDifficulty}
              />
            </aside>
          )}

          {/* Settings overlay (mobile) */}
          {showSettings && (
            <div className="md:hidden fixed inset-0 z-50 bg-cream-100 flex flex-col">
              <div className="bg-paper border-b border-cream-300 px-4 py-3 flex items-center justify-between">
                <h2 className="font-display text-sm text-navy tracking-wide">设置</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="font-body text-sm text-ink-pale hover:text-ink"
                >
                  关闭
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <RoleSettings
                  systemPrompt={systemPrompt}
                  difficulty={difficulty}
                  onPromptChange={setSystemPrompt}
                  onDifficultyChange={setDifficulty}
                />
              </div>
            </div>
          )}

          {/* Page outlet */}
          <div className="flex-1 overflow-auto bg-cream-100">
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
