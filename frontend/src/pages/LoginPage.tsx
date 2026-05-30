import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-paper px-8 py-10 rounded-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl text-navy tracking-wide">Vertin</h1>
            <div className="w-8 h-0.5 bg-gold mx-auto mt-3 mb-3" />
            <p className="font-body text-sm text-ink-pale">英语陪练 · 登录</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-body text-xs text-ink-pale mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-cream-50 text-ink border border-cream-300 rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors placeholder:text-ink-pale/30"
                required
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className="block font-body text-xs text-ink-pale mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-cream-50 text-ink border border-cream-300 rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-navy-pale transition-colors placeholder:text-ink-pale/30"
                required
                placeholder="至少6位"
              />
            </div>

            {error && <p className="font-body text-xs text-navy-pale">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-cream-100 rounded-sm py-2 font-body text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="font-body text-xs text-ink-pale/60 mt-6 text-center">
            没有账号？{' '}
            <Link to="/register" className="text-navy-pale hover:text-navy underline underline-offset-2">
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
