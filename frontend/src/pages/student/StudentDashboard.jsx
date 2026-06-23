import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { examsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { ClockIcon, PlayIcon, CheckCircleIcon, QrCodeIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { format, formatDistanceToNow } from 'date-fns'

function ExamStatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    upcoming: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }
  const labels = { active: '🟢 Live Now', upcoming: '⏰ Upcoming', completed: '✓ Completed' }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    examsAPI.studentExams()
      .then((r) => setExams(r.data))
      .finally(() => setLoading(false))
  }, [])

  const active = exams.filter((e) => e.status === 'active')
  const upcoming = exams.filter((e) => e.status === 'upcoming')
  const completed = exams.filter((e) => e.status === 'completed')

  const handleStartExam = (exam) => {
    if (exam.is_used) {
      alert('You have already submitted this exam.')
      return
    }
    navigate(`/student/exam/${exam.exam_id}`)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-primary-600 to-violet-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative">
          <h1 className="text-2xl font-bold">Welcome, {user?.name}! 🎓</h1>
          <p className="text-primary-100 mt-1">
            {active.length > 0
              ? `You have ${active.length} active exam${active.length > 1 ? 's' : ''} right now!`
              : upcoming.length > 0
              ? `You have ${upcoming.length} upcoming exam${upcoming.length > 1 ? 's' : ''}.`
              : 'No exams scheduled at the moment.'}
          </p>
          <div className="flex gap-4 mt-4">
            {[
              { label: 'Active', value: active.length, icon: '🔴' },
              { label: 'Upcoming', value: upcoming.length, icon: '📅' },
              { label: 'Completed', value: completed.length, icon: '✅' },
            ].map((s) => (
              <div key={s.label} className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold">{s.icon} {s.value}</p>
                <p className="text-xs text-primary-100">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <QrCodeIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Exams Assigned</h3>
          <p className="text-slate-400 max-w-xs mx-auto">
            Your teacher will send you an exam invitation via email or QR code.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active exams */}
          {active.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Exams
              </h2>
              <div className="grid gap-4">
                {active.map((exam) => (
                  <div key={exam.exam_id} className="card border-emerald-200 dark:border-emerald-800/50
                    bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ExamStatusBadge status="active" />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white">{exam.title}</h3>
                        {exam.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{exam.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" /> {exam.duration} minutes
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            Ends {formatDistanceToNow(new Date(exam.end_time), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartExam(exam)}
                        disabled={exam.is_used}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                          transition-all shadow-sm flex-shrink-0
                          ${exam.is_used
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none'
                          }`}
                      >
                        {exam.is_used ? (
                          <><CheckCircleIcon className="w-4 h-4" /> Submitted</>
                        ) : (
                          <><PlayIcon className="w-4 h-4" /> Start Exam</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">📅 Upcoming Exams</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((exam) => (
                  <div key={exam.exam_id} className="card">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <ExamStatusBadge status="upcoming" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{exam.title}</h3>
                    <div className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 flex-shrink-0" /> {exam.duration} minutes
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                        Starts {format(new Date(exam.start_time), 'dd MMM yyyy, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-medium">
                      ⏰ Starts {formatDistanceToNow(new Date(exam.start_time), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">✅ Completed Exams</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {completed.map((exam) => (
                  <div key={exam.exam_id} className="card opacity-80 hover:opacity-100 transition-opacity">
                    <ExamStatusBadge status="completed" />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mt-2">{exam.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ended {format(new Date(exam.end_time), 'dd MMM yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
