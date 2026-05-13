import { useState, useRef, useCallback, useEffect } from 'react'
import { ChatBubble } from '../components/ChatBubble'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { transcribeAudio, chatWithAI, synthesizeTTS, fetchTtsBlob } from '../api'
import type { Message } from '../types'

interface ChatPageProps {
  systemPrompt: string
  difficulty: string
}

export function ChatPage({ systemPrompt, difficulty }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const playAudio = useCallback((audioUrl: string, index: number) => {
    setPlayingIndex(index)
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
    }
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.onended = () => {
      setPlayingIndex(null)
      URL.revokeObjectURL(audioUrl)
    }
    audio.play()
  }, [])

  const handleStartRecording = useCallback(async () => {
    await startRecording()
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    stopRecording()
  }, [stopRecording])

  // Process audio when blob is available after recording stops
  useEffect(() => {
    if (!audioBlob || isRecording || isProcessing) return

    const processAudio = async () => {
      setIsProcessing(true)
      try {
        // 1. STT
        const sttResult = await transcribeAudio(audioBlob)
        const userText = sttResult.text
        setMessages((prev) => [...prev, { role: 'user', content: userText }])

        // 2. Chat — build history including the just-added user message
        const history = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userText },
        ]
        const chatResult = await chatWithAI(userText, history, {
          systemPrompt,
          difficulty,
        })
        const reply = chatResult.reply

        // 3. TTS - fetch as blob URL for reliable playback
        const ttsBlob = await fetchTtsBlob(reply)
        const audioUrl = URL.createObjectURL(ttsBlob)
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: reply,
          audioBase64: audioUrl,
        }])
      } catch (e) {
        console.error('Processing failed:', e)
      } finally {
        setIsProcessing(false)
        clearAudio()
      }
    }

    processAudio()
  }, [audioBlob, isRecording, isProcessing])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-20">
            <p className="text-lg">按住麦克风开始说话</p>
            <p className="text-sm mt-2">我来帮你练习英语口语</p>
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
        <VoiceRecorder
          isRecording={isRecording}
          isProcessing={isProcessing}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
        />
      </div>
    </div>
  )
}
