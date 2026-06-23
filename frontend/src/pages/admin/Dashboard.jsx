import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI, examsAPI } from '../../services/api'
import {
  ClipboardDocumentListIcon, UserGroupIcon, PlayIcon,
  CheckCircleIcon, ChartBarIcon, TrophyIcon,
  PlusIcon, ArrowRightIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

// Safe format — returns empty string on bad dates
const safeFormat = (dateStr, fmt) => {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return format(d, fmt)
  } catch {
    return '—'
  }
}

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="card flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function ExamStatusBadge({ exam }) {
  const now = new Date()
  const start = new Date(exam.start_time)
  const end = new Date(exam.end_time)

  if (now < start) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Upcoming</span>
  if (now >= start && now <= end) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Live</span>
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Completed</span>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsAPI.dashboard(), examsAPI.list()])
      .then(([statsRes, examsRes]) => {
        setStats(statsRes.data)
        setExams(examsRes.data.slice(0, 5))
      })
      .catch(() => {
        // API failed (e.g. new account with no data yet) — use empty defaults
        setStats({ total_exams: 0, total_students: 0, active_exams: 0,
          completed_exams: 0, average_score: 0, pass_percentage: 0 })
        setExams([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const statCards = [
    { icon: ClipboardDocumentListIcon, label: 'Total Exams', value: stats?.total_exams ?? 0, color: 'bg-primary-600' },
    { icon: UserGroupIcon, label: 'Total Students', value: stats?.total_students ?? 0, color: 'bg-violet-600' },
    { icon: PlayIcon, label: 'Active Exams', value: stats?.active_exams ?? 0, color: 'bg-emerald-600' },
    { icon: CheckCircleIcon, label: 'Completed', value: stats?.completed_exams ?? 0, color: 'bg-slate-500' },
    { icon: ChartBarIcon, label: 'Avg Score', value: `${stats?.average_score ?? 0}%`, color: 'bg-blue-600' },
    { icon: TrophyIcon, label: 'Pass Rate', value: `${stats?.pass_percentage ?? 0}%`, color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {format(new Date(), "EEEE, MMMM do yyyy")}
          </p>
        </div>
        <Link to="/admin/exams" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          New Exam
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Recent Exams */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Recent Exams</h2>
          <Link to="/admin/exams" className="text-sm text-primary-600 dark:text-primary-400 font-medium
            hover:underline flex items-center gap-1">
            View all <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No exams yet</p>
            <p className="text-sm text-slate-400 mb-4">Create your first exam to get started</p>
            <Link to="/admin/exams" className="btn-primary inline-flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Create Exam
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="table-header first:rounded-tl-lg">Exam Title</th>
                  <th className="table-header">Duration</th>
                  <th className="table-header">Start Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header last:rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className="table-row">
                    <td className="table-cell font-medium">{exam.title}</td>
                    <td className="table-cell text-slate-500">{exam.duration} min</td>
                    <td className="table-cell text-slate-500">
                      {safeFormat(exam.start_time, 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="table-cell"><ExamStatusBadge exam={exam} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/questions/${exam.id}`}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
                          Questions
                        </Link>
                        <Link to={`/admin/results/${exam.id}`}
                          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                          Results
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
