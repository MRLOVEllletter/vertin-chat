interface VoiceRecorderProps {
  isRecording: boolean
  isProcessing: boolean
  onStart: () => void
  onStop: () => void
}

export function VoiceRecorder({ isRecording, isProcessing, onStart, onStop }: VoiceRecorderProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onPointerDown={onStart}
        onPointerUp={onStop}
        onPointerLeave={onStop}
        disabled={isProcessing}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200
          ${isRecording
            ? 'bg-navy scale-110 shadow-md'
            : 'bg-paper border border-cream-300 hover:border-navy-pale hover:shadow-sm'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-ink-pale border-t-transparent rounded-full animate-spin" />
        ) : isRecording ? (
          <div className="w-3 h-3 bg-cream-100 rounded-sm" />
        ) : (
          <svg className="w-6 h-6 text-ink-pale" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      <span className={`font-body text-[10px] tracking-wider uppercase ${
        isRecording ? 'text-navy' : 'text-ink-pale/50'
      }`}>
        {isRecording ? '录音中' : isProcessing ? '处理中' : '说话'}
      </span>
    </div>
  )
}
