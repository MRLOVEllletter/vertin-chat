import { clsx } from 'clsx'

interface VoiceRecorderProps {
  isRecording: boolean
  isProcessing: boolean
  onStart: () => void
  onStop: () => void
}

export function VoiceRecorder({ isRecording, isProcessing, onStart, onStop }: VoiceRecorderProps) {
  return (
    <button
      onPointerDown={onStart}
      onPointerUp={onStop}
      onPointerLeave={onStop}
      disabled={isProcessing}
      className={clsx(
        'w-20 h-20 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-200',
        isRecording
          ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
          : 'bg-zinc-800 hover:bg-zinc-700',
        isProcessing && 'opacity-50 cursor-not-allowed',
      )}
    >
      {isProcessing ? (
        <div className="w-6 h-6 md:w-5 md:h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : isRecording ? (
        <div className="w-4 h-4 md:w-3 md:h-3 bg-white rounded-sm" />
      ) : (
        <svg className="w-7 h-7 md:w-6 md:h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  )
}
