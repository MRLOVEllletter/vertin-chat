import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

interface Bot {
  id: number
  name: string
  system_prompt: string
  is_default: boolean
}

interface Conv {
  id: number
  bot_id: number
  bot_name: string
  title: string
  message_count: number
  updated_at: string
}

export function Sidebar({
  activeConvId,
  onSelectConv,
  onNewConv,
}: {
  activeConvId: number | null
  onSelectConv: (id: number) => void
  onNewConv: (botId: number) => void
}) {
  const [bots, setBots] = useState<Bot[]>([])
  const [convs, setConvs] = useState<Conv[]>([])
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const [bres, cres] = await Promise.all([
      api.fetch('/api/bots'),
      api.fetch('/api/conversations?limit=50'),
    ])
    if (bres.ok) setBots(await bres.json())
    if (cres.ok) setConvs(await cres.json())
  }, [])

  useEffect(() => { load() }, [load])

  const deleteConv = async (id: number) => {
    await api.fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (activeConvId === id) onSelectConv(0)
    load()
  }

  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col h-full bg-zinc-900/50">
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Bots</h2>
        {bots.map((b) => (
          <button
            key={b.id}
            onClick={() => onNewConv(b.id)}
            className="w-full text-left px-2 py-1.5 rounded text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {b.name}
            {b.is_default && <span className="text-xs text-zinc-500 ml-1">· default</span>}
          </button>
        ))}
        <button
          onClick={() => navigate('/bots')}
          className="w-full text-left px-2 py-1.5 rounded text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
        >
          + Manage Bots
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Conversations</h2>
        {convs.length === 0 && (
          <p className="text-xs text-zinc-600">No conversations yet</p>
        )}
        {convs.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded cursor-pointer text-sm px-2 py-1.5 mb-0.5 ${
              activeConvId === c.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
            }`}
            onClick={() => onSelectConv(c.id)}
          >
            <span className="flex-1 truncate">{c.title || 'New Conversation'}</span>
            <span className="text-xs text-zinc-600">{c.bot_name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteConv(c.id) }}
              className="hidden group-hover:block text-xs text-zinc-600 hover:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
