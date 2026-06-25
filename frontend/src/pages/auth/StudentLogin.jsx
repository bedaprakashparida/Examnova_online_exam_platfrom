import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Captcha from '../../components/common/Captcha'

function errMsg(err) {
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  return JSON.stringify(d)
}

export default function StudentLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [captchaValid, setCaptchaValid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password, 'student')
      toast.success('Logged in successfully!')
      navigate('/student')
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 flex-col items-center justify-center p-12 text-white">
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 backdrop-blur">
          <AcademicCapIcon className="w-10 h-10 text-emerald-300" />
        </div>
        <h1 className="text-4xl font-black mb-4">Student Portal</h1>
        <p className="text-emerald-200 text-center text-lg max-w-sm">
          Enter your exam using the unique invite link sent to your email, or scan your QR code.
        </p>
        <div className="mt-12 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur max-w-sm">
          <p className="text-emerald-200 font-semibold mb-1">Got an exam invitation?</p>
          <p className="text-emerald-300 text-sm">Click the link in your email or scan your QR code to join instantly!</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Back to home */}
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              Back to Home
            </Link>
          </div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl mb-4">
              <AcademicCapIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Student Sign In</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Use your exam link or sign in below</p>
          </div>

          {/* QR link CTA */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">📩 Use your exam invitation link</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Click the link in your email or scan your QR code — no password needed!</p>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
            <div className="relative flex justify-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 px-2">— or sign in with password —</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input-field" placeholder="student@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="input-field pr-12"
                  placeholder="Your password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <Captcha onVerify={setCaptchaValid} />
            
            <button type="submit" disabled={loading || !captchaValid}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl
                hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</> : 'Sign In as Student'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400 space-x-3">
            <Link to="/teacher/login" className="hover:underline">Teacher login</Link>
            <span>·</span>
            <Link to="/admin/login" className="hover:underline">Admin login</Link>
          </div>
        </div>
      </div>

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative transform transition-all scale-100">
            <button 
              type="button" 
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Reset Password</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                For security reasons, student passwords can only be reset by a classroom teacher or the school administrator. 
                <br /><br />
                Please contact your exam coordinator or teacher to receive your login credentials.
              </p>
              <button 
                type="button" 
                onClick={() => setShowForgot(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                Okay, Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
