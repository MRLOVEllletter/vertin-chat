import { useState, useRef, useCallback, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ChatBubble } from '../components/ChatBubble'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { api, transcribeAudio, chatWithAI, synthesizeTTS } from '../api'
import type { Message } from '../types'

interface LayoutContext {
  activeConvId: number | null
  convBotId: number
  systemPrompt: string
  difficulty: string
}

export function ChatPage({ systemPrompt: _sp, difficulty: _diff }: { systemPrompt: string; difficulty: string }) {
  const ctx = useOutletContext<LayoutContext>()
  const convId = ctx.activeConvId

  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [botPrompt, setBotPrompt] = useState('')
  const [, setBotName] = useState('Vertin')
  const [currentConvId, setCurrentConvId] = useState<number | null>(convId)
  const [textInput, setTextInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder()

  useEffect(() => {
    if (!convId) {
      setMessages([])
      setCurrentConvId(null)
      api.fetch(`/api/bots`).then(async (res) => {
        if (res.ok) {
          const bots = await res.json()
          const bot = bots.find((b: any) => b.id === ctx.convBotId)
          if (bot) { setBotPrompt(bot.system_prompt); setBotName(bot.name) }
        }
      })
      return
    }
    setCurrentConvId(convId)
    api.fetch(`/api/conversations/${convId}`).then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          audioBase64: m.audio_base64,
        })))
        setBotPrompt('')
        const bres = await api.fetch('/api/bots')
        if (bres.ok) {
          const bots = await bres.json()
          const bot = bots.find((b: any) => b.id === data.bot_id)
          if (bot) { setBotPrompt(bot.system_prompt); setBotName(bot.name) }
        }
      }
    })
  }, [convId, ctx.convBotId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const playAudio = useCallback((url: string, index: number) => {
    setPlayingIndex(index)
    const audio = new Audio(url)
    audio.onended = () => {
      setPlayingIndex(null)
      URL.revokeObjectURL(url)
    }
    audio.play()
  }, [])

  const handleStartRecording = useCallback(async () => {
    await startRecording()
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    stopRecording()
  }, [stopRecording])

  const saveMessage = async (conv: number, role: string, content: string, audioB64?: string) => {
    await api.fetch(`/api/conversations/${conv}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content, audio_base64: audioB64 || null }),
    })
  }

  const processUserInput = useCallback(async (userText: string) => {
    setIsProcessing(true)
    let conv = currentConvId

    try {
      if (!conv) {
        const cres = await api.fetch('/api/conversations', {
          method: 'POST',
          body: JSON.stringify({ bot_id: ctx.convBotId, title: userText.slice(0, 50) }),
        })
        if (cres.ok) {
          const cdata = await cres.json()
          conv = cdata.id
          setCurrentConvId(conv)
        }
      }

      if (conv) await saveMessage(conv, 'user', userText).catch(() => {})

      setMessages((prev) => [...prev, { role: 'user', content: userText }])

      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userText })

      const chatResult = await chatWithAI(userText, history, {
        systemPrompt: botPrompt || undefined,
        difficulty: 'intermediate',
        conversationId: conv || undefined,
      })
      const reply = chatResult.reply

      const ttsResult = await synthesizeTTS(reply)

      if (conv) await saveMessage(conv, 'assistant', reply, ttsResult.audio_url).catch(() => {})

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: reply,
        audioBase64: ttsResult.audio_url,
      }])
    } catch (e) {
      console.error('Processing failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }, [currentConvId, ctx.convBotId, messages, botPrompt])

  useEffect(() => {
    if (!audioBlob || isRecording || isProcessing) return

    const processAudio = async () => {
      try {
        console.log('[STT] sending audio, lang:', language, 'blob size:', audioBlob.size)
        const sttResult = await transcribeAudio(audioBlob, language)
        const userText = sttResult.text
        console.log('[STT] result:', userText)
        if (!userText.trim()) return
        clearAudio()
        await processUserInput(userText)
      } catch (e) {
        console.error('STT failed:', e)
        setIsProcessing(false)
        clearAudio()
      }
    }
    processAudio()
  }, [audioBlob, isRecording, isProcessing]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim()
    if (!text || isProcessing) return
    setTextInput('')
    await processUserInput(text)
  }, [textInput, isProcessing, processUserInput])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <p className="font-display text-lg text-ink-pale/60 italic">开始一段对话</p>
            <div className="w-12 h-px bg-cream-300 mt-4 mb-3" />
            <p className="font-body text-sm text-ink-pale/40">
              {language === 'zh' ? '输入文字开始' : '按住说话'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            content={msg.content}
            onPlay={msg.audioBase64 ? () => playAudio(msg.audioBase64!, i) : undefined}
            isPlaying={playingIndex === i}
          />
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-paper px-4 py-3 rounded-sm border-l-[3px] border-gold" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-cream-300 bg-cream-50 px-4 md:px-6 py-3 md:py-4 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className={`font-body text-xs px-2.5 py-1.5 rounded-sm transition-colors ${
              language === 'zh'
                ? 'bg-navy text-cream-100'
                : 'bg-paper text-ink-pale border border-cream-300 hover:border-navy-pale'
            }`}
          >
            {language === 'en' ? 'EN' : '中文'}
          </button>

          {language === 'zh' ? (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit() }}
                placeholder="输入消息..."
                disabled={isProcessing}
                className="flex-1 bg-paper text-ink border border-cream-300 rounded-sm px-4 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors placeholder:text-ink-pale/30 disabled:opacity-50"
              />
              <button
                onClick={handleTextSubmit}
                disabled={isProcessing || !textInput.trim()}
                className="bg-navy text-cream-100 rounded-sm p-2 hover:bg-navy-light transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <VoiceRecorder
              isRecording={isRecording}
              isProcessing={isProcessing}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
            />
          )}
        </div>
      </div>
    </div>
  )
}
