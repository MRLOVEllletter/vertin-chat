interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  onPlay?: () => void
  isPlaying?: boolean
}

export function ChatBubble({ role, content, onPlay, isPlaying }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {isUser ? (
        /* User — navy card, right-aligned */
        <div
          className="max-w-[75%] md:max-w-[65%] bg-navy text-cream-100 px-4 py-3 rounded-sm"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        /* Vertin — white card with gold left border */
        <div className="max-w-[75%] md:max-w-[65%]" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-1.5 ml-0.5">
            <span className="font-display text-xs text-gold italic">Vertin</span>
            <span className="text-cream-400 text-[8px]">✦</span>
          </div>
          <div
            className="bg-paper px-4 py-3 rounded-sm border-l-[3px] border-gold"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <p className="font-body text-sm text-ink leading-relaxed whitespace-pre-wrap">{content}</p>

            {onPlay && (
              <button
                onClick={onPlay}
                className="mt-2 flex items-center gap-1.5 font-body text-xs text-gold-dark hover:text-gold transition-colors"
              >
                {isPlaying ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
                    播放中...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    播放
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
