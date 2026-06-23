import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function errMsg(err) {
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => e.msg || JSON.stringify(e)).join(', ')
  return JSON.stringify(d)
}

function OtpInput({ value, onChange }) {
  const digits = value.split('')
  const handleKey = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = v; onChange(arr.join(''))
    if (v && i < 5) document.getElementById(`treg-${i+1}`)?.focus()
    if (!v && i > 0) document.getElementById(`treg-${i-1}`)?.focus()
  }
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    onChange(p.padEnd(6,'').slice(0,6))
    document.getElementById('treg-5')?.focus()
    e.preventDefault()
  }
  return (
    <div className="flex gap-3 justify-center">
      {Array(6).fill('').map((_,i) => (
        <input key={i} id={`treg-${i}`} type="text" inputMode="numeric" maxLength={1}
          value={digits[i]||''} onChange={e=>handleKey(i,e)} onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2
            border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
            text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none
            focus:ring-2 focus:ring-blue-500/20 transition-all" />
      ))}
    </div>
  )
}

export default function TeacherRegister() {
  const [stage, setStage] = useState('form')
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' })
  const [showPwd, setShowPwd] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await authAPI.adminRegisterSendOtp({ name: form.name, email: form.email, password: form.password, role: 'teacher' })
      toast.success(`Verification code sent to ${form.email}`)
      setStage('otp')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length < 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      const { data } = await authAPI.adminRegisterVerifyOtp({ email: form.email, otp })
      login(data)
      toast.success(`Account created! Welcome, ${data.name}!`)
      navigate('/teacher')
    } catch (err) { toast.error(errMsg(err)); setOtp('') }
    finally { setLoading(false) }
  }

  const handleResend = async () => {
    setResending(true)
    try { await authAPI.resendOtp({ email: form.email }); toast.success('New code sent!'); setOtp('') }
    catch (err) { toast.error(errMsg(err)) }
    finally { setResending(false) }
  }

  const pwdStrength = form.password.length >= 16 ? 'strong'
    : form.password.length >= 12 ? 'good'
    : form.password.length >= 8 ? 'weak' : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl mb-4">
              <AcademicCapIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Teacher Account</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Join as an exam teacher</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {['Details','Verify Email'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i===0 && stage==='form' ? 'bg-blue-600 text-white'
                    : i===0 ? 'bg-emerald-500 text-white'
                    : i===1 && stage==='otp' ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  {i===0 && stage!=='form' ? '✓' : i+1}
                </div>
                <span className="text-xs text-slate-500">{s}</span>
                {i<1 && <div className={`flex-1 h-0.5 ${stage==='otp'?'bg-emerald-500':'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {stage === 'form' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" name="name" className="input-field" placeholder="Mr. John Smith"
                  value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" name="email" className="input-field" placeholder="teacher@school.edu"
                  value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPwd?'text':'password'} name="password" className="input-field pr-12"
                    placeholder="Min. 8 characters" value={form.password} onChange={handleChange} required minLength={8} />
                  <button type="button" onClick={()=>setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1">
                      {['weak','good','strong'].map(level => (
                        <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                          (level==='weak' && ['weak','good','strong'].includes(pwdStrength))
                          ||(level==='good' && ['good','strong'].includes(pwdStrength))
                          ||(level==='strong' && pwdStrength==='strong')
                            ? level==='strong'?'bg-emerald-500':level==='good'?'bg-amber-400':'bg-red-400'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 capitalize">{pwdStrength||'Too short'}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" name="confirm" className="input-field"
                  placeholder="Repeat your password" value={form.confirm} onChange={handleChange} required />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                  A 6-digit code will be sent to your email to verify your account
                </p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending Code…</> : 'Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-3">
                  <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verify your email</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the 6-digit code sent to <span className="font-semibold text-blue-600">{form.email}</span>
                </p>
              </div>
              <OtpInput value={otp} onChange={setOtp} />
              <button type="submit" disabled={loading||otp.length<6}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Verifying…</> : '✓ Verify & Create Account'}
              </button>
              <div className="text-center space-y-2">
                <button type="button" onClick={handleResend} disabled={resending}
                  className="text-sm text-blue-600 hover:underline">{resending?'Sending…':'Resend code'}</button>
                <br/>
                <button type="button" onClick={()=>{setStage('form');setOtp('')}}
                  className="text-sm text-slate-500 hover:underline">← Back to form</button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
            Already have an account?{' '}
            <Link to="/teacher/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
