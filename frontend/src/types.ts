export interface Message {
  role: 'user' | 'assistant'
  content: string
  audioBase64?: string
}

export interface AppConfig {
  systemPrompt: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  scenario: string
}

export interface WSIncoming {
  type: 'stt_start' | 'stt_result' | 'chat_result' | 'tts_result' | 'done' | 'error' | 'config_ack'
  text?: string
  language?: string
  reply?: string
  audio_base64?: string
  duration_ms?: number
  message?: string
}
