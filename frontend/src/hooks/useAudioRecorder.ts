import { useState, useRef, useCallback } from 'react'

interface UseAudioRecorderReturn {
  isRecording: boolean
  audioBlob: Blob | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearAudio: () => void
}

function getSupportedMimeType(): string {
  const types = ['audio/webm', 'audio/mp4', 'audio/aac', '']
  for (const t of types) {
    if (t && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedRef = useRef(false)

  const startRecording = useCallback(async () => {
    if (startedRef.current) return
    setError(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      startedRef.current = true

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const type = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        startedRef.current = false
      }

      recorder.onerror = () => {
        setError('Recording failed')
        startedRef.current = false
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      startedRef.current = false
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied')
      } else {
        setError('Failed to start recording')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const clearAudio = useCallback(() => {
    setAudioBlob(null)
    setError(null)
  }, [])

  return { isRecording, audioBlob, error, startRecording, stopRecording, clearAudio }
}
