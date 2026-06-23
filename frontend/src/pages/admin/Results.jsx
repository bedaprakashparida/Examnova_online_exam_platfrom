import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { resultsAPI, reportsAPI } from '../../services/api'
import {
  ArrowLeftIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  ChartBarIcon, TableCellsIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export default function AdminResults() {
  const { examId } = useParams()
  const [results, setResults] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('results') // 'results' | 'logs'
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    Promise.all([resultsAPI.examResults(examId), resultsAPI.activityLogs(examId)])
      .then(([rRes, lRes]) => { setResults(rRes.data); setLogs(lRes.data) })
      .finally(() => setLoading(false))
  }, [examId])

  const handleCSV = async () => {
    try {
      const { data } = await reportsAPI.exportCSV(examId)
      downloadBlob(data, `results_exam_${examId}.csv`)
      toast.success('CSV downloaded!')
    } catch { toast.error('Export failed') }
  }

  const handlePDF = async (studentId, studentName) => {
    setDownloading(studentId)
    try {
      const { data } = await reportsAPI.adminDownloadPDF(examId, studentId)
      downloadBlob(data, `report_${studentName.replace(' ', '_')}.pdf`)
      toast.success('PDF downloaded!')
    } catch { toast.error('PDF generation failed') }
    finally { setDownloading(null) }
  }

  const passCount = results.filter((r) => r.pass_fail_status === 'Pass').length
  const avgPct = results.length
    ? (results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1)
    : 0

  const gradeColor = (grade) => {
    const map = { A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      D: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      F: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
    return map[grade] || ''
  }

  const activityIcon = (type) => {
    const map = {
      tab_switch: '🔀', fullscreen_exit: '↙️', camera_disabled: '📷',
      microphone_disabled: '🎙️', network_disconnect: '🌐', exam_submission: '✅', exam_start: '🚀'
    }
    return map[type] || '📋'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/exams" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Results</h1>
          <p className="text-sm text-slate-500 mt-1">Exam ID: {examId}</p>
        </div>
        <button onClick={handleCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Appeared', value: results.length, color: 'text-slate-900 dark:text-white' },
          { label: 'Passed', value: passCount, color: 'text-emerald-600' },
          { label: 'Failed', value: results.length - passCount, color: 'text-red-600' },
          { label: 'Average Score', value: `${avgPct}%`, color: 'text-primary-600' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-fit">
        {[
          { id: 'results', icon: TableCellsIcon, label: 'Results' },
          { id: 'logs', icon: ChartBarIcon, label: `Activity Logs (${logs.length})` },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all
              ${tab === id ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'results' ? (
        results.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No results submitted yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">#</th>
                    <th className="table-header">Student</th>
                    <th className="table-header">Roll No.</th>
                    <th className="table-header">Score</th>
                    <th className="table-header">Percentage</th>
                    <th className="table-header">Grade</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Submitted</th>
                    <th className="table-header">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .sort((a, b) => b.percentage - a.percentage)
                    .map((r, i) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell text-slate-400">{i + 1}</td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{r.student_name}</p>
                          <p className="text-xs text-slate-400">{r.student_email}</p>
                        </div>
                      </td>
                      <td className="table-cell text-slate-500">{r.student_roll || '—'}</td>
                      <td className="table-cell font-semibold">{r.score} / {r.total_marks}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 max-w-16">
                            <div className={`h-1.5 rounded-full ${r.pass_fail_status === 'Pass' ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(r.percentage, 100)}%` }} />
                          </div>
                          <span className="font-semibold text-sm">{r.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={r.pass_fail_status === 'Pass' ? 'badge-pass' : 'badge-fail'}>
                          {r.pass_fail_status}
                        </span>
                      </td>
                      <td className="table-cell text-slate-500 text-xs">
                        {new Date(r.submitted_at).toLocaleString()}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handlePDF(r.student_id, r.student_name)}
                          disabled={downloading === r.student_id}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600
                            hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Download PDF"
                        >
                          {downloading === r.student_id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <DocumentArrowDownIcon className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // Activity logs tab
        logs.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No activity logs recorded.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Student</th>
                    <th className="table-header">Activity</th>
                    <th className="table-header">Details</th>
                    <th className="table-header">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-medium text-slate-900 dark:text-white">{log.student_name}</p>
                        <p className="text-xs text-slate-400">{log.student_email}</p>
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span>{activityIcon(log.activity_type)}</span>
                          {log.activity_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="table-cell text-slate-500 text-sm">{log.details || '—'}</td>
                      <td className="table-cell text-slate-500 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
