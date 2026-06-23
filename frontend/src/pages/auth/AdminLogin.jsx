import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, EnvelopeIcon, CommandLineIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Captcha from '../../components/common/Captcha'
import VirtualKeyboard from '../../components/common/VirtualKeyboard'

function errMsg(err) {
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => e.msg || JSON.stringify(e)).join(', ')
  return JSON.stringify(d)
}

function OtpInput({ value, onChange, prefix = 'otp' }) {
  const digits = value.split('')
  const handleKey = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = v
    onChange(arr.join(''))
    if (v && i < 5) document.getElementById(`${prefix}-${i + 1}`)?.focus()
    if (!v && i > 0) document.getElementById(`${prefix}-${i - 1}`)?.focus()
  }
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6))
    document.getElementById(`${prefix}-5`)?.focus()
    e.preventDefault()
  }
  return (
    <div className="flex gap-3 justify-center">
      {Array(6).fill('').map((_, i) => (
        <input key={i} id={`${prefix}-${i}`} type="text" inputMode="numeric"
          maxLength={1} value={digits[i] || ''}
          onChange={e => handleKey(i, e)} onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2
            border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
            text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none
            focus:ring-2 focus:ring-violet-500/20 transition-all" />
      ))}
    </div>
  )
}

export default function AdminLogin() {
  const [stage, setStage] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [otp, setOtp] = useState('')
  const [captchaValid, setCaptchaValid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.adminRequestOtp({ email, password })
      if (data.role && data.role !== 'admin') {
        toast.error('This is not an admin account. Use Teacher login instead.')
        return
      }
      if (data.email_sent === false && data.otp) {
        // Email failed — pre-fill OTP so admin can still log in
        setOtp(data.otp)
        toast.error('⚠️ Email failed — OTP is shown below. Copy it to sign in.', { duration: 10000 })
      } else {
        toast.success(`OTP sent to ${email} ✓`)
      }
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
      toast.error(errMsg(err)); setOtp('')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setResending(true)
    try { await authAPI.resendOtp({ email }); toast.success('New OTP sent!'); setOtp('') }
    catch (err) { toast.error(errMsg(err)) }
    finally { setResending(false) }
  }

  const handleForgotRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.forgotPasswordRequestOtp({ email })
      if (data.otp) {
        setOtp(data.otp)
        toast.error(`⚠️ Email failed — OTP is shown below: ${data.otp}`, { duration: 15000 })
      } else {
        toast.success(`Password reset OTP sent to ${email} ✓`)
      }
      setStage('forgot_reset')
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotReset = async (e) => {
    e.preventDefault()
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await authAPI.forgotPasswordReset({ email, otp, new_password: password })
      toast.success('Password reset successfully! Please sign in with your new password.')
      setPassword('')
      setOtp('')
      setStage('credentials')
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-purple-950 via-slate-900 to-violet-950 flex-col items-center justify-center p-12 text-white">
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 backdrop-blur">
          <ShieldCheckIcon className="w-10 h-10 text-violet-300" />
        </div>
        <h1 className="text-4xl font-black mb-4">Admin Portal</h1>
        <p className="text-violet-200 text-center text-lg max-w-sm">
          System administration dashboard. Manage all staff, classes, data and configurations.
        </p>
        <div className="mt-12 space-y-3 w-full max-w-xs">
          {['Manage all teachers','System-wide analytics','Full exam oversight','Configure settings'].map(f => (
            <div key={f} className="flex items-center gap-3 text-violet-200 text-sm">
              <div className="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-violet-300 text-xs">✓</span>
              </div>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Back to home */}
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              Back to Home
            </Link>
          </div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl shadow-xl mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Sign In</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Super administrator access</p>
          </div>

          {stage === 'credentials' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="label">Admin Email</label>
                <input type="email" className="input-field" placeholder="admin@school.edu"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => { setStage('forgot_request'); setOtp(''); setPassword('') }}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-500 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input-field pr-20"
                    placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => setShowKeyboard(!showKeyboard)}
                      className={`p-1.5 rounded-md transition-colors ${showKeyboard ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                      title="Virtual Keyboard"
                    >
                      <CommandLineIcon className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {showKeyboard && (
                  <VirtualKeyboard 
                    value={password} 
                    onChange={setPassword} 
                    onClose={() => setShowKeyboard(false)} 
                  />
                )}
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl p-3">
                <p className="text-xs text-violet-700 dark:text-violet-300 flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                  A 6-digit OTP will be sent to your email
                </p>
              </div>

              <Captcha onVerify={setCaptchaValid} />

              <button type="submit" disabled={loading || !captchaValid}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl
                  hover:from-violet-700 hover:to-fuchsia-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP…</> : 'Send OTP →'}
              </button>
            </form>
          )}

          {stage === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl mb-3">
                  <ShieldCheckIcon className="w-7 h-7 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Check your email</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Code sent to <span className="font-semibold text-violet-600">{email}</span>
                </p>
              </div>
              <OtpInput value={otp} onChange={setOtp} prefix="admin-otp" />
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl
                  hover:from-violet-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</> : '✓ Verify & Sign In'}
              </button>
              <div className="text-center space-y-2">
                <button type="button" onClick={handleResend} disabled={resending}
                  className="text-sm text-violet-600 hover:underline">{resending ? 'Sending…' : 'Resend OTP'}</button>
                <br />
                <button type="button" onClick={() => { setStage('credentials'); setOtp('') }}
                  className="text-sm text-slate-500 hover:underline">← Back</button>
              </div>
            </form>
          )}

          {stage === 'forgot_request' && (
            <form onSubmit={handleForgotRequestOtp} className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recover Password</h3>
                <p className="text-xs text-slate-500 mt-1">We will send you a 6-digit OTP to verify your email.</p>
              </div>
              <div>
                <label className="label">Admin Email</label>
                <input type="email" className="input-field" placeholder="admin@school.edu"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl
                  hover:from-violet-700 hover:to-fuchsia-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Sending OTP…' : 'Send Reset OTP →'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => { setStage('credentials'); setOtp('') }}
                  className="text-sm text-slate-500 hover:underline">← Back to Sign In</button>
              </div>
            </form>
          )}

          {stage === 'forgot_reset' && (
            <form onSubmit={handleForgotReset} className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verify Reset OTP</h3>
                <p className="text-xs text-slate-500 mt-1">Enter the 6-digit code and choose your new password.</p>
              </div>
              
              <OtpInput value={otp} onChange={setOtp} prefix="forgot-admin-otp" />

              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input-field pr-20"
                    placeholder="Min. 8 characters"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-655"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showPwd ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || otp.length < 6 || password.length < 8}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl
                  hover:from-violet-700 hover:to-fuchsia-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Resetting Password…' : '✓ Reset Password'}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => { setStage('forgot_request'); setOtp(''); setPassword('') }}
                  className="text-sm text-slate-500 hover:underline">← Back</button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            <Link to="/teacher/login" className="text-violet-600 hover:underline">Teacher login →</Link>
            {' · '}
            <Link to="/login" className="text-slate-400 hover:underline">Student login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
