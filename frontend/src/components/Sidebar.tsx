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
    <aside className="w-full h-full flex flex-col">
      {/* Bots */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-cream-300">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-body text-xs text-ink-pale uppercase tracking-widest">角色</h2>
          {onClose && (
            <button onClick={onClose} className="md:hidden text-ink-pale hover:text-ink p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {bots.map((b) => (
            <button
              key={b.id}
              onClick={() => onNewConv(b.id)}
              className={`w-full text-left font-body text-sm px-3 py-1.5 rounded-sm transition-colors ${
                activeBotId === b.id && activeConvId === null
                  ? 'bg-navy text-cream-100'
                  : 'text-ink hover:bg-cream-300/50'
              }`}
            >
              {b.name}
              {b.is_default && <span className="text-ink-pale/50 text-xs ml-2">· 默认</span>}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/bots')}
          className="w-full text-left font-body text-xs text-ink-pale hover:text-ink transition-colors mt-2 px-3 py-1.5"
        >
          + 管理角色
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        <h2 className="font-body text-xs text-ink-pale uppercase tracking-widest mb-3">历史记录</h2>

        {convs.length === 0 && (
          <p className="font-body text-sm text-ink-pale/50 italic mt-8 text-center">暂无对话</p>
        )}

        <div className="space-y-0.5">
          {convs.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-sm cursor-pointer px-3 py-1.5 transition-colors ${
                activeConvId === c.id
                  ? 'bg-cream-300/70 text-ink'
                  : 'text-ink-pale hover:bg-cream-300/50 hover:text-ink'
              }`}
              onClick={() => onSelectConv(c.id)}
            >
              <span className="flex-1 truncate font-body text-sm">{c.title || '新对话'}</span>
              <span className="font-body text-[10px] text-ink-pale/40 italic">{c.bot_name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConv(c.id) }}
                className="hidden group-hover:block font-body text-xs text-ink-pale/40 hover:text-navy transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
