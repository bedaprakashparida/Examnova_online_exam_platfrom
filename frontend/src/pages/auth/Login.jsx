import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import LogoIcon from '../../components/common/LogoIcon'

function errMsg(err) {
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => e.msg || JSON.stringify(e)).join(', ')
  return JSON.stringify(d)
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const digits = value.split('')
  const inputs = Array(6).fill('')

  const handleKey = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = v
    onChange(arr.join(''))
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
    if (!v && i > 0) document.getElementById(`otp-${i - 1}`)?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6))
    document.getElementById(`otp-5`)?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-3 justify-center">
      {inputs.map((_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2
            border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
            text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none
            focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
      ))}
    </div>
  )
}

// ── Admin Login (2-step OTP) ───────────────────────────────────────────────────
function AdminLogin() {
  const [stage, setStage] = useState('credentials') // 'credentials' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.adminRequestOtp({ email, password })
      toast.success(`OTP sent to ${email}`)
      setStage('otp')
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const { data } = await authAPI.adminVerifyOtp({ email, otp })
      login(data)
      toast.success(`Welcome, ${data.name}!`)
      navigate('/admin')
    } catch (err) {
      toast.error(errMsg(err))
      setOtp('')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await authAPI.resendOtp({ email })
      toast.success('New OTP sent!')
      setOtp('')
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setResending(false) }
  }

  if (stage === 'otp') {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100
            dark:bg-primary-900/30 rounded-2xl mb-3">
            <ShieldCheckIcon className="w-7 h-7 text-primary-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Check your email</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter the 6-digit code sent to<br />
            <span className="font-semibold text-primary-600">{email}</span>
          </p>
        </div>

        <OtpInput value={otp} onChange={setOtp} />

        <button type="submit" disabled={loading || otp.length < 6}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
            : '✓ Verify & Sign In'}
        </button>

        <div className="text-center space-y-2">
          <button type="button" onClick={handleResend} disabled={resending}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            {resending ? 'Sending…' : 'Resend OTP'}
          </button>
          <br />
          <button type="button" onClick={() => { setStage('credentials'); setOtp('') }}
            className="text-sm text-slate-500 hover:underline">
            ← Back
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestOtp} className="space-y-4">
      <div>
        <label className="label">Email Address</label>
        <input type="email" className="input-field" placeholder="admin@example.com"
          value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <label className="label">Password</label>
        <div className="relative">
          <input type={showPwd ? 'text' : 'password'} className="input-field pr-12"
            placeholder="Enter your password"
            value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password" />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            {showPwd ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
          A one-time password will be sent to your email for verification
        </p>
      </div>
      <button type="submit" disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
        {loading
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP…</>
          : 'Send OTP →'}
      </button>
    </form>
  )
}

// ── Student Login (password) ───────────────────────────────────────────────────
function StudentLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.loginStudent({ email, password })
      login(data)
      toast.success(`Welcome, ${data.name}!`)
      navigate('/student')
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-primary-800 dark:text-primary-300 mb-1">
          📩 Use your exam invitation link
        </p>
        <p className="text-xs text-primary-600 dark:text-primary-400">
          Click the link in your email or scan your QR code — no password needed!
        </p>
      </div>
      <p className="text-xs text-center text-slate-400">— or sign in with password —</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input-field" placeholder="student@email.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="input-field pr-12"
              placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              {showPwd ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
            : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

// ── Main Login Page ────────────────────────────────────────────────────────────
export default function Login() {
  const [role, setRole] = useState('admin')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-violet-950
      flex items-center justify-center p-4">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-6">
            <LogoIcon className="w-16 h-16 mx-auto mb-4 drop-shadow-xl" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ExamNova</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Secure Online Examination Platform</p>
          </div>

          {/* Role Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-6">
            {['admin', 'student'].map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-200 ${
                  role === r
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                {r === 'admin' ? '👨‍🏫 Admin' : '🎓 Student'}
              </button>
            ))}
          </div>

          {role === 'admin' ? <AdminLogin /> : <StudentLogin />}

          {role === 'admin' && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
              New admin?{' '}
              <Link to="/register" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
                Create account
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
