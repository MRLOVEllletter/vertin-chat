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
  activeBotId,
  onSelectConv,
  onNewConv,
  onClose,
}: {
  activeConvId: number | null
  activeBotId: number
  onSelectConv: (id: number) => void
  onNewConv: (botId: number) => void
  onClose?: () => void
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
    <aside className="w-full border-r border-zinc-800 flex flex-col h-full bg-zinc-900/50">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase">角色</h2>
          {onClose && (
            <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-zinc-200 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {bots.map((b) => (
          <button
            key={b.id}
            onClick={() => onNewConv(b.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
              activeBotId === b.id && activeConvId === null
                ? 'bg-blue-600/20 text-blue-300'
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {b.name}
            {b.is_default && <span className="text-xs text-zinc-500 ml-1">· default</span>}
          </button>
        ))}
        <button
          onClick={() => navigate('/bots')}
          className="w-full text-left px-2 py-1.5 rounded text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
        >
          + 管理角色
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase mb-2">对话记录</h2>
        {convs.length === 0 && (
          <p className="text-xs text-zinc-600">暂无对话</p>
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
