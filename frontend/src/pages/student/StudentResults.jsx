import { useState, useEffect } from 'react'
import { resultsAPI, reportsAPI } from '../../services/api'
import { DocumentArrowDownIcon, TrophyIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function GradeCircle({ grade, percentage }) {
  const color = {
    A: 'text-emerald-500', B: 'text-blue-500', C: 'text-amber-500', D: 'text-orange-500', F: 'text-red-500'
  }[grade] || 'text-slate-500'

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
          className="text-slate-200 dark:text-slate-700" strokeWidth="2.5" />
        <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
          stroke="currentColor" className={color}
          strokeDasharray={`${percentage} ${100 - percentage}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${color}`}>{grade}</span>
        <span className="text-xs text-slate-500 font-medium">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  )
}

export default function StudentResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    resultsAPI.myResults()
      .then((r) => setResults(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleDownloadPDF = async (examId, examTitle) => {
    setDownloading(examId)
    try {
      const { data } = await reportsAPI.downloadStudentPDF(examId)
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `result_${examTitle.replace(/\s+/g, '_')}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch { toast.error('PDF download failed') }
    finally { setDownloading(null) }
  }

  const handleExpandDetail = async (examId) => {
    if (expandedId === examId) { setExpandedId(null); setDetail(null); return }
    setExpandedId(examId)
    try {
      const { data } = await resultsAPI.studentExamDetail(examId)
      setDetail(data)
    } catch { toast.error('Failed to load details') }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Results</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{results.length} exam(s) completed</p>
      </div>

      {results.length === 0 ? (
        <div className="card text-center py-16">
          <TrophyIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Results Yet</h3>
          <p className="text-slate-400">Complete an exam to see your results here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              {/* Summary row */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Grade circle */}
                <div className="flex-shrink-0">
                  <GradeCircle grade={r.grade} percentage={r.percentage} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{r.exam_title}</h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div>
                      <p className="text-xs text-slate-400">Score</p>
                      <p className="font-bold text-slate-900 dark:text-white">{r.score} / {r.total_marks}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Percentage</p>
                      <p className="font-bold text-slate-900 dark:text-white">{r.percentage.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Status</p>
                      <span className={r.pass_fail_status === 'Pass' ? 'badge-pass' : 'badge-fail'}>
                        {r.pass_fail_status === 'Pass'
                          ? <><CheckCircleIcon className="w-3.5 h-3.5 inline mr-1" />Pass</>
                          : <><XCircleIcon className="w-3.5 h-3.5 inline mr-1" />Fail</>}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Submitted</p>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {format(new Date(r.submitted_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownloadPDF(r.exam_id, r.exam_title)}
                    disabled={downloading === r.exam_id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
                      hover:bg-red-100 transition-all border border-red-200 dark:border-red-800"
                  >
                    {downloading === r.exam_id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <DocumentArrowDownIcon className="w-4 h-4" />
                    )}
                    PDF Report
                  </button>
                  <button
                    onClick={() => handleExpandDetail(r.exam_id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400
                      hover:bg-primary-100 transition-all border border-primary-200 dark:border-primary-800"
                  >
                    {expandedId === r.exam_id ? '▲ Hide Details' : '▼ View Details'}
                  </button>
                </div>
              </div>

              {/* Expanded Answer Detail */}
              {expandedId === r.exam_id && detail && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6 animate-fade-in">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Answer Analysis</h4>
                  <div className="space-y-3">
                    {detail.answers_detail.map((ans, i) => (
                      <div key={ans.question_id} className={`rounded-xl p-4 border
                        ${ans.is_correct
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                        }`}>
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${ans.is_correct ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            {ans.is_correct ? '✓' : '✗'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white text-sm mb-2">{i + 1}. {ans.question}</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className={`px-2 py-1 rounded-lg font-medium
                                ${ans.selected
                                  ? ans.is_correct
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                Your answer: {ans.selected || 'Not answered'}
                              </span>
                              {!ans.is_correct && (
                                <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">
                                  Correct: {ans.correct}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
