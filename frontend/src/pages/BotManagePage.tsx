import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

interface Bot {
  id: number
  name: string
  system_prompt: string
  is_default: boolean
}

export function BotManagePage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const res = await api.fetch('/api/bots')
    if (res.ok) setBots(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async () => {
    setError('')
    try {
      if (editId) {
        await api.fetch(`/api/bots/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, system_prompt: prompt }),
        })
      } else {
        await api.fetch('/api/bots', {
          method: 'POST',
          body: JSON.stringify({ name, system_prompt: prompt }),
        })
      }
      setShowCreate(false)
      setEditId(null)
      setName('')
      setPrompt('')
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this bot and all related conversations?')) return
    await api.fetch(`/api/bots/${id}`, { method: 'DELETE' })
    load()
  }

  const startEdit = (bot: Bot) => {
    setEditId(bot.id)
    setName(bot.name)
    setPrompt(bot.system_prompt)
    setShowCreate(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="font-body text-sm text-ink-pale hover:text-ink transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <button
          onClick={() => { setShowCreate(true); setEditId(null); setName(''); setPrompt(''); setError('') }}
          className="bg-navy text-cream-100 font-body text-sm px-4 py-1.5 rounded-sm hover:bg-navy-light transition-colors"
        >
          + 新建角色
        </button>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h2 className="font-display text-xl text-navy tracking-wide">我的角色</h2>
        <div className="w-8 h-0.5 bg-gold mt-2" />
      </div>

      {/* Bot list */}
      <div className="space-y-3">
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="bg-paper px-4 py-3 rounded-sm"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-sm text-navy tracking-wide">
                {bot.name}
                {bot.is_default && <span className="font-body text-xs text-ink-pale/50 ml-2 italic">(默认)</span>}
              </h3>
              {!bot.is_default && (
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(bot)}
                    className="font-body text-xs text-ink-pale hover:text-navy transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(bot.id)}
                    className="font-body text-xs text-ink-pale/50 hover:text-navy transition-colors"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
            <p className="font-body text-xs text-ink-pale/70 leading-relaxed line-clamp-2">{bot.system_prompt}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-paper p-6 w-full max-w-md mx-4 rounded-sm" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <h3 className="font-display text-base text-navy tracking-wide mb-5">
              {editId ? '编辑角色' : '新建角色'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block font-body text-xs text-ink-pale mb-1">名称</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-cream-50 text-ink border border-cream-300 rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors placeholder:text-ink-pale/30"
                  maxLength={50}
                  placeholder="角色名称"
                />
              </div>
              <div>
                <label className="block font-body text-xs text-ink-pale mb-1">角色设定</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-cream-50 text-ink border border-cream-300 rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors h-32 resize-none placeholder:text-ink-pale/30"
                  maxLength={2000}
                  placeholder="输入 System Prompt..."
                />
              </div>
              {error && <p className="font-body text-xs text-navy-pale">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 font-body text-sm text-ink-pale hover:text-ink transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 font-body text-sm text-cream-100 bg-navy hover:bg-navy-light rounded-sm transition-colors"
                >
                  {editId ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
