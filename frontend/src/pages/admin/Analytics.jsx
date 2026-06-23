import { useState, useEffect } from 'react'
import { analyticsAPI, examsAPI } from '../../services/api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

const GRADE_COLORS = { A: '#10b981', B: '#6366f1', C: '#f59e0b', D: '#f97316', F: '#ef4444' }
const PIE_COLORS = ['#10b981', '#ef4444']

function SectionTitle({ children }) {
  return <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{children}</h2>
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [examAnalytics, setExamAnalytics] = useState(null)
  const [topStudents, setTopStudents] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.dashboard(),
      examsAPI.list(),
      analyticsAPI.allExamsPerformance(),
    ]).then(([statsRes, examsRes, trendRes]) => {
      setStats(statsRes.data)
      setExams(examsRes.data)
      setTrend(trendRes.data)
      if (examsRes.data.length > 0) {
        setSelectedExam(String(examsRes.data[0].id))
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedExam) return
    Promise.all([
      analyticsAPI.examAnalytics(selectedExam),
      analyticsAPI.topStudents(selectedExam),
    ]).then(([aRes, tRes]) => {
      setExamAnalytics(aRes.data)
      setTopStudents(tRes.data)
    })
  }, [selectedExam])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const passFail = examAnalytics ? [
    { name: 'Passed', value: examAnalytics.passed },
    { name: 'Failed', value: examAnalytics.failed },
  ] : []

  const gradeData = examAnalytics?.grade_distribution
    ? Object.entries(examAnalytics.grade_distribution).map(([grade, count]) => ({ grade, count }))
    : []

  const trendData = trend.map((t) => ({
    name: t.exam_title.substring(0, 15) + (t.exam_title.length > 15 ? '…' : ''),
    average: t.average_percentage,
    pass: t.pass_count,
    fail: t.fail_count,
  }))

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Performance insights across all exams</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Exams', value: stats?.total_exams ?? 0, color: 'text-primary-600' },
          { label: 'Students', value: stats?.total_students ?? 0, color: 'text-violet-600' },
          { label: 'Active', value: stats?.active_exams ?? 0, color: 'text-emerald-600' },
          { label: 'Completed', value: stats?.completed_exams ?? 0, color: 'text-slate-600' },
          { label: 'Avg Score', value: `${stats?.average_score ?? 0}%`, color: 'text-blue-600' },
          { label: 'Pass Rate', value: `${stats?.pass_percentage ?? 0}%`, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="card text-center py-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Exam selector */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="label mb-0 whitespace-nowrap">Exam Details:</label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="input-field max-w-xs"
          >
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      {examAnalytics && (
        <>
          {/* Exam summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Invited', value: examAnalytics.invited },
              { label: 'Appeared', value: examAnalytics.appeared },
              { label: 'Passed', value: examAnalytics.passed, cls: 'text-emerald-600' },
              { label: 'Failed', value: examAnalytics.failed, cls: 'text-red-600' },
              { label: 'Avg Score', value: `${examAnalytics.average_score}%`, cls: 'text-primary-600' },
            ].map((s) => (
              <div key={s.label} className="card text-center py-3">
                <p className={`text-2xl font-bold ${s.cls || 'text-slate-900 dark:text-white'}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pass vs Fail */}
            <div className="card">
              <SectionTitle>Pass vs Fail</SectionTitle>
              {passFail[0]?.value || passFail[1]?.value ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={passFail} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                      paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {passFail.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-400 text-sm text-center py-8">No data yet</p>}
            </div>

            {/* Grade Distribution */}
            <div className="card">
              <SectionTitle>Grade Distribution</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {gradeData.map((entry) => (
                      <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Students */}
          <div className="card">
            <SectionTitle>🏆 Top 10 Students</SectionTitle>
            {topStudents.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No results yet</p>
            ) : (
              <div className="space-y-2">
                {topStudents.map((s) => (
                  <div key={s.rank} className="flex items-center gap-4 p-3 rounded-xl
                    hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${s.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        s.rank === 2 ? 'bg-slate-200 text-slate-600' :
                        s.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank - 1] : s.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{s.student_name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.student_email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-lg text-primary-600">{s.percentage.toFixed(1)}%</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${s.pass_fail_status === 'Pass' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        Grade {s.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Performance Trend */}
      {trendData.length > 1 && (
        <div className="card">
          <SectionTitle>📈 Exam Performance Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="average" stroke="#6366f1" strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 4 }} name="Avg %" />
              <Line type="monotone" dataKey="pass" stroke="#10b981" strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }} name="Pass" />
              <Line type="monotone" dataKey="fail" stroke="#ef4444" strokeWidth={2}
                dot={{ fill: '#ef4444', r: 3 }} name="Fail" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
