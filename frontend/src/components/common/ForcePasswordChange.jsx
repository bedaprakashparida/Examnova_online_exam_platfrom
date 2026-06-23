import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import { LockClosedIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function ForcePasswordChange({ children }) {
  const { user, login } = useAuth()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  // Only teachers and admins need this. Students don't have passwords.
  if (!user || user.role === 'student' || !user.needs_password_change) {
    return children
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (pwd.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (pwd !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    
    setLoading(true)
    try {
      const { data } = await authAPI.changePassword({ new_password: pwd })
      toast.success('Password updated successfully!')
      login(data) // this updates the token and sets needs_password_change to false
    } catch (err) {
      const d = err?.response?.data?.detail
      toast.error(typeof d === 'string' ? d : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-6">
          <LockClosedIcon className="w-7 h-7 text-violet-600 dark:text-violet-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Set Your Password</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Welcome to ExamNova! Since this is your first time logging in with the admin-generated credentials, please set a new personal password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input 
                type={show ? 'text' : 'password'}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all pr-12 text-slate-900 dark:text-white"
                placeholder="Min. 8 characters"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <input 
              type={show ? 'text' : 'password'}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900 dark:text-white"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Save Password & Continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
