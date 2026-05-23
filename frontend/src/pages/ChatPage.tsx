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
  const [botName, setBotName] = useState('Vertin')
  const [currentConvId, setCurrentConvId] = useState<number | null>(convId)
  const [textInput, setTextInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder()

  // Load conversation messages when convId changes
  useEffect(() => {
    if (!convId) {
      setMessages([])
      setCurrentConvId(null)
      // Load bot prompt for new conversations
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
        setBotPrompt('') // will be loaded from bot
        // Get bot prompt
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

  // Save a message to the current conversation
  const saveMessage = async (conv: number, role: string, content: string, audioB64?: string) => {
    await api.fetch(`/api/conversations/${conv}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content, audio_base64: audioB64 || null }),
    })
  }

  // Shared logic: send user text through LLM → TTS, persist messages
  const processUserInput = useCallback(async (userText: string) => {
    setIsProcessing(true)
    let conv = currentConvId

    try {
      // Create conversation if needed
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

      // Chat
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userText })

      const chatResult = await chatWithAI(userText, history, {
        systemPrompt: botPrompt || undefined,
        difficulty: 'intermediate',
        conversationId: conv || undefined,
      })
      const reply = chatResult.reply

      // TTS
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

  // Process audio when blob is available after recording stops (English mode)
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
  }, [audioBlob, isRecording, isProcessing])  // eslint-disable-line react-hooks/exhaustive-deps

  // Text input submit (Chinese mode)
  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim()
    if (!text || isProcessing) return
    setTextInput('')
    await processUserInput(text)
  }, [textInput, isProcessing, processUserInput])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-20">
            <p className="text-lg">和 {botName} 开始对话</p>
            <p className="text-sm mt-2">
              {language === 'zh' ? '输入文字并发送' : '按住麦克风开始说话'}
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
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-zinc-800 p-4 flex justify-center items-center gap-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            language === 'zh' ? 'bg-red-600/20 text-red-300 border border-red-600/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
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
              placeholder="输入中文或英文..."
              disabled={isProcessing}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
            />
            <button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-full p-2 transition-colors"
            >
              <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  )
}
