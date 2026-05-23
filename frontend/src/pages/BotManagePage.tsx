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
    if (!confirm('Delete this bot and all its conversations?')) return
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
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/')} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back
        </button>
        <button
          onClick={() => { setShowCreate(true); setEditId(null); setName(''); setPrompt(''); setError('') }}
          className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-500"
        >
          + New Bot
        </button>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">My Bots</h2>

      <div className="space-y-3">
        {bots.map((bot) => (
          <div key={bot.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-medium">
                {bot.name}
                {bot.is_default && <span className="text-xs text-zinc-500 ml-2">(default)</span>}
              </h3>
              {!bot.is_default && (
                <div className="flex gap-2">
                  <button onClick={() => startEdit(bot)} className="text-xs text-zinc-400 hover:text-white">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(bot.id)} className="text-xs text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-500 line-clamp-2">{bot.system_prompt}</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editId ? 'Edit Bot' : 'Create Bot'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 outline-none"
                  maxLength={50}
                  placeholder="My English Tutor"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">System Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 outline-none h-32 resize-none"
                  maxLength={2000}
                  placeholder="You are an English tutor who..."
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-500"
                >
                  {editId ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
