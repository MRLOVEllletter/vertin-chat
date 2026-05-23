import { clsx } from 'clsx'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  onPlay?: () => void
  isPlaying?: boolean
}

export function ChatBubble({ role, content, onPlay, isPlaying }: ChatBubbleProps) {
  const isUser = role === 'user'
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm',
        )}
      >
        {!isUser && (
          <div className="text-xs text-zinc-400 mb-1">Vertin</div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
        {!isUser && onPlay && (
          <button
            onClick={onPlay}
            className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {isPlaying ? '播放中...' : '播放'}
          </button>
        )}
      </div>
    </div>
  )
}
