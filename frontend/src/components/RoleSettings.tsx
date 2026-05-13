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
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">预设角色</h3>
        <div className="space-y-1">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => onPromptChange(p.prompt)}
              className="block w-full text-left text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded px-2 py-1.5 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">难度</h3>
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-200 rounded px-3 py-2 text-sm border border-zinc-700"
        >
          <option value="beginner">初级</option>
          <option value="intermediate">中级</option>
          <option value="advanced">高级</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">角色设定 / System Prompt</h3>
        <textarea
          value={systemPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={12}
          className="w-full bg-zinc-800 text-zinc-200 rounded px-3 py-2 text-xs border border-zinc-700 resize-none font-mono"
        />
      </div>
    </div>
  )
}
