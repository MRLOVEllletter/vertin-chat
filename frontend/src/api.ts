const API_BASE = ''

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  const form = new FormData()
  form.append('file', audioBlob, 'audio.wav')
  const res = await fetch(`${API_BASE}/api/stt`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('STT failed')
  return res.json()
}

export async function chatWithAI(
  message: string,
  history: { role: string; content: string }[],
  config: { systemPrompt?: string; difficulty?: string; scenario?: string },
): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      system_prompt: config.systemPrompt,
      difficulty: config.difficulty || 'intermediate',
      scenario: config.scenario || 'daily',
    }),
  })
  if (!res.ok) throw new Error('Chat failed')
  return res.json()
}

export async function synthesizeTTS(text: string): Promise<{ audio_base64: string; duration_ms: number }> {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('TTS failed')
  return res.json()
}

export async function fetchTtsBlob(text: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/tts/stream?text=${encodeURIComponent(text)}`)
  if (!res.ok) throw new Error('TTS stream failed')
  return res.blob()
}
