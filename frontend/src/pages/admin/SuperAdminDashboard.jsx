import { useState, useEffect } from 'react'
import { authAPI } from '../../services/api'
import {
  UserGroupIcon, AcademicCapIcon, TrashIcon, PlusIcon,
  ShieldCheckIcon, PencilSquareIcon, EyeIcon, EyeSlashIcon,
  CheckCircleIcon, XCircleIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function errMsg(err) {
  if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED') {
    return 'Cannot reach server — is the backend running on port 8001?'
  }
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => e.msg).join(', ')
  return JSON.stringify(d)
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function AddTeacherModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', email:'', password: generatePassword(), teacher_role:'teacher' })
  const [showPwd, setShowPwd] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.adminCreateTeacher(form)
      toast.success(`✅ ${data.name} created! Credentials emailed to ${form.email}`)
      onCreated(data)
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Teacher Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Credentials will be sent to the teacher's email</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input-field" placeholder="Mr. John Smith" required
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input-field" placeholder="teacher@school.edu" required
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="label flex justify-between">
              <span>Password</span>
              <button type="button" onClick={() => setForm({...form, password: generatePassword()})}
                className="text-xs text-violet-600 hover:underline font-normal">↻ Generate new</button>
            </label>
            <div className="relative">
              <input type={showPwd?'text':'password'} className="input-field pr-12 font-mono"
                placeholder="Min. 8 characters" required minLength={8}
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input-field" value={form.teacher_role}
              onChange={e => setForm({...form, teacher_role: e.target.value})}>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin (Super)</option>
            </select>
          </div>

          {/* Email notice */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 flex items-start gap-2">
            <EnvelopeIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Credentials will be emailed</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                The teacher will receive their email &amp; password at <strong>{form.email || 'their email address'}</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating &amp; Sending…</>
                : <><CheckCircleIcon className="w-4 h-4"/>Create &amp; Send Email</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadTeachers = () => {
    setLoading(true)
    authAPI.listTeachers()
      .then(r => setTeachers(r.data))
      .catch((err) => {
        const msg = errMsg(err)
        toast.error('Failed to load teachers: ' + msg, { duration: 6000 })
        console.error('[SuperAdmin] listTeachers error:', err?.response?.status, err?.response?.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTeachers() }, [])

  const handleDelete = async (t) => {
    if (!confirm(`Delete "${t.name}"? This will remove all their exams and data.`)) return
    setDeletingId(t.id)
    try {
      await authAPI.deleteTeacher(t.id)
      toast.success(`${t.name} deleted`)
      setTeachers(prev => prev.filter(x => x.id !== t.id))
    } catch (err) { toast.error(errMsg(err)) }
    finally { setDeletingId(null) }
  }

  const handleRoleChange = async (t, newRole) => {
    try {
      await authAPI.changeTeacherRole(t.id, newRole)
      toast.success(`${t.name} is now ${newRole}`)
      setTeachers(prev => prev.map(x => x.id === t.id ? {...x, teacher_role: newRole} : x))
    } catch (err) { toast.error(errMsg(err)) }
  }

  const admins   = teachers.filter(t => t.teacher_role === 'admin')
  const teacherList = teachers.filter(t => t.teacher_role === 'teacher')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all teachers and system access</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Staff', value: teachers.length, icon: UserGroupIcon, color: 'violet' },
          { label: 'Teachers', value: teacherList.length, icon: AcademicCapIcon, color: 'blue' },
          { label: 'Admins', value: admins.length, icon: ShieldCheckIcon, color: 'emerald' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${s.color}-100 dark:bg-${s.color}-900/30 flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-6 h-6 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Teachers Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">All Staff Accounts</h2>
          <span className="text-sm text-slate-500">{teachers.length} total</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No teachers yet. Add one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {teachers.map(t => (
              <div key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{t.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{t.name}</p>
                  <p className="text-sm text-slate-500 truncate">{t.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Role badge + change */}
                  <select
                    value={t.teacher_role}
                    onChange={e => handleRoleChange(t, e.target.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer
                      ${t.teacher_role === 'admin'
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                      }`}>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>

                  {/* Delete */}
                  <button onClick={() => handleDelete(t)}
                    disabled={deletingId === t.id}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all disabled:opacity-50">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddTeacherModal
          onClose={() => setShowAdd(false)}
          onCreated={t => setTeachers(prev => [...prev, t])}
        />
      )}
    </div>
  )
}
