import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { examsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { PlusIcon, PencilIcon, TrashIcon, QuestionMarkCircleIcon,
  EnvelopeIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const defaultForm = {
  title: '', description: '', duration: 60,
  start_time: '', end_time: ''
}

function ExamModal({ exam, onClose, onSave }) {
  const [form, setForm] = useState(exam ? {
    ...exam,
    start_time: exam.start_time ? exam.start_time.substring(0, 16) : '',
    end_time: exam.end_time ? exam.end_time.substring(0, 16) : '',
  } : defaultForm)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      }
      if (exam) {
        await examsAPI.update(exam.id, payload)
        toast.success('Exam updated!')
      } else {
        await examsAPI.create(payload)
        toast.success('Exam created!')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save exam')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {exam ? 'Edit Exam' : 'Create New Exam'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Exam Title *</label>
            <input className="input-field" placeholder="e.g. Mid-Term Mathematics Exam"
              value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Brief description of the exam..."
              value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} />
          </div>
          <div>
            <label className="label">Duration (minutes) *</label>
            <input type="number" className="input-field" min={5} max={300}
              value={form.duration} onChange={(e) => setForm({...form, duration: parseInt(e.target.value)})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time *</label>
              <input type="datetime-local" className="input-field"
                value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} required />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input type="datetime-local" className="input-field"
                value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})} required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : exam ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ExamManagement() {
  const { user } = useAuth()
  const basePath = user?.role === 'admin' ? '/admin' : '/teacher'
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | exam object

  const load = () => {
    examsAPI.list().then(r => setExams(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam and all its data?')) return
    try {
      await examsAPI.delete(id)
      toast.success('Exam deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const getStatus = (exam) => {
    const now = new Date()
    const start = new Date(exam.start_time)
    const end = new Date(exam.end_time)
    if (now < start) return { label: 'Upcoming', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' }
    if (now <= end) return { label: '🟢 Live', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' }
    return { label: 'Completed', classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exams.length} exam(s) created</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Create Exam
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <ClockIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Exams Yet</h3>
          <p className="text-slate-400 mb-6">Create your first exam to get started</p>
          <button onClick={() => setModal('create')} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Create First Exam
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const status = getStatus(exam)
            return (
              <div key={exam.id} className="card hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-lg truncate">{exam.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.classes}`}>
                        {status.label}
                      </span>
                      {user?.role === 'admin' && exam.created_by_name && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          By: {exam.created_by_name}
                        </span>
                      )}
                    </div>
                    {exam.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">{exam.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" /> {exam.duration} min
                      </span>
                      <span>📅 {format(new Date(exam.start_time), 'dd MMM yyyy, HH:mm')}</span>
                      <span>🔔 {format(new Date(exam.end_time), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(exam)}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50
                          dark:hover:bg-primary-900/20 transition-all" title="Edit">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(exam.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                          dark:hover:bg-red-900/20 transition-all" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`${basePath}/questions/${exam.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                          bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400
                          hover:bg-primary-100 transition-all">
                        <QuestionMarkCircleIcon className="w-3.5 h-3.5" /> Questions
                      </Link>
                      <Link to={`${basePath}/email/${exam.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                          bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400
                          hover:bg-violet-100 transition-all">
                        <EnvelopeIcon className="w-3.5 h-3.5" /> Invitations
                      </Link>
                      <Link to={`${basePath}/results/${exam.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                          bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400
                          hover:bg-emerald-100 transition-all">
                        <ChartBarIcon className="w-3.5 h-3.5" /> Results
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ExamModal
          exam={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
