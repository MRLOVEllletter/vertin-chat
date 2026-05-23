class ApiClient {
  private token: string | null = null

  setToken(t: string | null) {
    this.token = t
  }

  async fetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {}
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`
    if (init.body && typeof init.body === 'string') {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(`${API_BASE}${input}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> || {}) },
    })

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return res
  }
}

export const api = new ApiClient()

const API_BASE = import.meta.env.VITE_API_BASE || ''

// ---- Health ----
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await api.fetch('/api/health')
    return res.ok
  } catch {
    return false
  }
}

// ---- STT ----
export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  const form = new FormData()
  form.append('file', audioBlob, 'audio.wav')
  const res = await api.fetch('/api/stt', { method: 'POST', body: form })
  if (!res.ok) throw new Error('STT failed')
  return res.json()
}

// ---- Chat ----
export async function chatWithAI(
  message: string,
  history: { role: string; content: string }[],
  config: {
    systemPrompt?: string
    difficulty?: string
    scenario?: string
    conversationId?: number
  },
): Promise<{ reply: string }> {
  const res = await api.fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history,
      system_prompt: config.systemPrompt,
      difficulty: config.difficulty || 'intermediate',
      scenario: config.scenario || 'daily',
      conversation_id: config.conversationId,
    }),
  })
  if (!res.ok) throw new Error('Chat failed')
  return res.json()
}

// ---- TTS ----
export async function synthesizeTTS(text: string): Promise<{ audio_url: string; duration_ms: number }> {
  const res = await api.fetch('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('TTS failed')
  return res.json()
}

// ---- Auth ----
export interface User {
  id: number
  email: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

// Auth calls don't use api.fetch (no token needed)
async function authFetch(path: string, body: object): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return authFetch('/api/auth/login', { email, password })
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return authFetch('/api/auth/register', { email, password })
}

export async function getMe(): Promise<User> {
  const res = await api.fetch('/api/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}
