import { useRef, useCallback, useState } from 'react'
import type { WSIncoming } from '../types'

type WSCallback = {
  onSttStart?: () => void
  onSttResult?: (text: string) => void
  onChatResult?: (reply: string) => void
  onTtsResult?: (audioBase64: string) => void
  onDone?: () => void
  onError?: (msg: string) => void
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback((callbacks: WSCallback) => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/api/chat/stream`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      const data: WSIncoming = JSON.parse(event.data)
      switch (data.type) {
        case 'stt_start':     callbacks.onSttStart?.(); break
        case 'stt_result':    callbacks.onSttResult?.(data.text ?? ''); break
        case 'chat_result':   callbacks.onChatResult?.(data.reply ?? ''); break
        case 'tts_result':    callbacks.onTtsResult?.(data.audio_base64 ?? ''); break
        case 'done':          callbacks.onDone?.(); break
        case 'error':         callbacks.onError?.(data.message ?? ''); break
      }
    }
  }, [])

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data))
  }, [])

  const sendAudio = useCallback(async (audioBlob: Blob) => {
    const buf = await audioBlob.arrayBuffer()
    send({ type: 'audio', data: Array.from(new Uint8Array(buf)) })
  }, [send])

  const sendConfig = useCallback((config: { systemPrompt?: string; difficulty?: string }) => {
    send({ type: 'config', ...config })
  }, [send])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
  }, [])

  return { connected, connect, sendAudio, sendConfig, disconnect }
}
