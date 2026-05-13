interface RoleSettingsProps {
  systemPrompt: string
  difficulty: string
  onPromptChange: (val: string) => void
  onDifficultyChange: (val: string) => void
}

const PRESETS = [
  { name: 'Default Vertin', prompt: 'You are Vertin, a Timekeeper from Reverse:1999. You help the user practice English conversation. Keep responses concise, natural, and in character. Correct grammar mistakes subtly.' },
  { name: 'Friendly Tutor', prompt: 'You are a warm and encouraging English tutor. Praise the user often, gently correct mistakes, and keep the conversation fun and engaging.' },
  { name: 'Strict Teacher', prompt: 'You are a strict but fair English teacher. Correct every mistake explicitly, challenge the user with harder vocabulary, and expect proper grammar.' },
]

export function RoleSettings({ systemPrompt, difficulty, onPromptChange, onDifficultyChange }: RoleSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Presets</h3>
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
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Difficulty</h3>
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-200 rounded px-3 py-2 text-sm border border-zinc-700"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">System Prompt</h3>
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
