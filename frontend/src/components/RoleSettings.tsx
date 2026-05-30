interface RoleSettingsProps {
  systemPrompt: string
  difficulty: string
  onPromptChange: (val: string) => void
  onDifficultyChange: (val: string) => void
}

const PRESETS = [
  { name: '默认维尔汀', prompt: 'You are Vertin, a Timekeeper from Reverse:1999. You help the user practice English conversation. Keep responses concise, natural, and in character. Correct grammar mistakes subtly.' },
  { name: '友好导师', prompt: 'You are a warm and encouraging English tutor. Praise the user often, gently correct mistakes, and keep the conversation fun and engaging.' },
  { name: '严格教师', prompt: 'You are a strict but fair English teacher. Correct every mistake explicitly, challenge the user with harder vocabulary, and expect proper grammar.' },
]

export function RoleSettings({ systemPrompt, difficulty, onPromptChange, onDifficultyChange }: RoleSettingsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-body text-xs text-ink-pale uppercase tracking-widest mb-2">预设角色</h3>
        <div className="space-y-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => onPromptChange(p.prompt)}
              className="block w-full text-left font-body text-sm text-ink-pale hover:text-ink hover:bg-cream-300/50 rounded-sm px-3 py-2 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-cream-300" />

      <div>
        <h3 className="font-body text-xs text-ink-pale uppercase tracking-widest mb-2">难度</h3>
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className="w-full bg-paper text-ink border border-cream-300 rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors"
        >
          <option value="beginner">初级</option>
          <option value="intermediate">中级</option>
          <option value="advanced">高级</option>
        </select>
      </div>

      <hr className="border-cream-300" />

      <div>
        <h3 className="font-body text-xs text-ink-pale uppercase tracking-widest mb-2">角色设定</h3>
        <textarea
          value={systemPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={12}
          className="w-full bg-paper text-ink border border-cream-300 rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}
