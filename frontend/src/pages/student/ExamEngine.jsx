import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { questionsAPI, resultsAPI, examsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ChevronLeftIcon, ChevronRightIcon, CameraIcon, MicrophoneIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

// ── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const ref = useRef(null)

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(p => {
        if (p <= 1) { clearInterval(ref.current); onExpire(); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [onExpire])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const isWarn = remaining < 300
  const isDanger = remaining < 60

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold transition-all
      ${isDanger ? 'bg-red-600 text-white animate-pulse' : isWarn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'}`}>
      <ClockIcon className="w-5 h-5" />
      <span>{h > 0 && `${String(h).padStart(2,'0')}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
    </div>
  )
}

// ── Option Button ────────────────────────────────────────────────────────────
function OptionButton({ letter, text, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group
        ${selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
        }`}>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
        ${selected ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-primary-100'}`}>
        {letter}
      </span>
      <span className="flex-1">{text}</span>
      {selected && <CheckCircleIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />}
    </button>
  )
}

// ── Warning Overlay ──────────────────────────────────────────────────────────
function WarningOverlay({ count, reason, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-2 border-red-600 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-white mb-2">Security Violation!</h2>
        <p className="text-red-300 mb-2">{reason}</p>
        <p className="text-slate-400 text-sm mb-6">
          This incident has been logged. <strong className="text-red-400">{count} warning{count > 1 ? 's' : ''}</strong> recorded.
          {count >= 3 && <span className="block mt-1 text-red-400 font-semibold">Next violation will auto-submit your exam!</span>}
        </p>
        <button onClick={onDismiss} className="btn-primary w-full">I Understand — Resume Exam</button>
      </div>
    </div>
  )
}

// ── Confirm Submit Modal ─────────────────────────────────────────────────────
function ConfirmSubmitModal({ answered, total, onConfirm, onCancel }) {
  const unanswered = total - answered
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submit Exam?</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          You answered <strong className="text-slate-900 dark:text-white">{answered}</strong> of <strong>{total}</strong> questions.
        </p>
        {unanswered > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              {unanswered} question{unanswered > 1 ? 's are' : ' is'} unanswered and will be marked incorrect.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Review</button>
          <button onClick={onConfirm} className="btn-primary flex-1">Submit Now</button>
        </div>
      </div>
    </div>
  )
}

// ── Camera Feed (small overlay) ───────────────────────────────────────────────
function CameraOverlay({ videoRef, cameraOk, micOk }) {
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2 items-end">
      {/* Camera feed */}
      <div className="relative w-32 h-24 rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-xl">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {!cameraOk && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
            <CameraIcon className="w-6 h-6 text-red-400" />
          </div>
        )}
        {/* Status dots */}
        <div className="absolute bottom-1 left-1 flex gap-1">
          <div className={`w-2 h-2 rounded-full ${cameraOk ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} title="Camera" />
          <div className={`w-2 h-2 rounded-full ${micOk ? 'bg-blue-400 animate-pulse' : 'bg-red-500'}`} title="Mic" />
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${cameraOk ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
          <CameraIcon className="w-3 h-3" />{cameraOk ? 'Live' : 'Off'}
        </span>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${micOk ? 'bg-blue-900/60 text-blue-400' : 'bg-red-900/60 text-red-400'}`}>
          <MicrophoneIcon className="w-3 h-3" />{micOk ? 'Active' : 'Off'}
        </span>
      </div>
    </div>
  )
}

// ── Main Exam Engine ──────────────────────────────────────────────────────────
const MAX_WARNINGS = 4   // auto-submit on this many warnings

export default function ExamEngine() {
  const { examId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [questions,    setQuestions]    = useState([])
  const [answers,      setAnswers]      = useState({})
  const [currentIdx,   setCurrentIdx]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [duration,     setDuration]     = useState(null)
  const [violations,   setViolations]   = useState(0)
  const [showWarning,  setShowWarning]  = useState(false)
  const [warningReason,setWarningReason]= useState('')
  const [cameraOk,     setCameraOk]     = useState(false)
  const [micOk,        setMicOk]        = useState(false)
  const [examInfo,     setExamInfo]     = useState(null)

  const videoRef          = useRef(null)
  const cameraStreamRef   = useRef(null)
  const micStreamRef      = useRef(null)
  const autosaveRef       = useRef(null)
  const submitCalledRef   = useRef(false)
  const violationsRef     = useRef(0)  // ref so event handlers see current value

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitExam = useCallback(async (reason = 'manual') => {
    if (submitCalledRef.current || submitted) return
    submitCalledRef.current = true
    setSubmitting(true)
    setShowConfirm(false)
    setShowWarning(false)
    clearInterval(autosaveRef.current)

    // Stop camera & mic
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current?.getTracks().forEach(t => t.stop())

    const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
      question_id: parseInt(qId),
      selected_answer: ans,
    }))

    try {
      await resultsAPI.submit({ exam_id: parseInt(examId), answers: answersPayload })
      setSubmitted(true)
      const messages = {
        manual:    '✅ Exam submitted successfully!',
        timer:     '⏰ Time up! Exam auto-submitted.',
        tab:       '🚫 Tab switch detected — Exam auto-submitted.',
        violations:'⚠️ Too many violations — Exam auto-submitted.',
      }
      toast.success(messages[reason] || '✅ Submitted', { duration: 6000 })
      document.exitFullscreen?.().catch(() => {})
      setTimeout(() => navigate('/student/results'), 2500)
    } catch {
      toast.error('Submission failed. Retrying…')
      submitCalledRef.current = false
    } finally {
      setSubmitting(false)
    }
  }, [answers, examId, submitted, navigate])

  // ── Violation handler ──────────────────────────────────────────────────────
  const addViolation = useCallback((reason, actType = 'violation') => {
    violationsRef.current += 1
    const count = violationsRef.current
    setViolations(count)
    setWarningReason(reason)
    setShowWarning(true)

    resultsAPI.logActivity({
      exam_id: parseInt(examId),
      activity_type: actType,
      details: reason,
    }).catch(() => {})

    if (count >= MAX_WARNINGS) {
      setTimeout(() => submitExam('violations'), 3000)
    }
  }, [examId, submitExam])

  // ── Load exam + questions ──────────────────────────────────────────────────
  useEffect(() => {
    questionsAPI.listForStudent(examId)
      .then(({ data }) => setQuestions(data))
      .catch(() => { toast.error('Failed to load questions'); navigate('/student') })

    examsAPI.get(examId)
      .then(({ data }) => { setDuration(data.duration * 60); setExamInfo(data) })
      .finally(() => setLoading(false))
  }, [examId])

  // ── Start camera (continuous) ──────────────────────────────────────────────
  useEffect(() => {
    let active = true
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        cameraStreamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraOk(true)
      } catch {
        setCameraOk(false)
        addViolation('Camera access denied or disconnected', 'camera_denied')
      }
    }
    startCam()
    return () => {
      active = false
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Start microphone (continuous) ─────────────────────────────────────────
  useEffect(() => {
    let active = true
    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        micStreamRef.current = stream
        setMicOk(true)
      } catch {
        setMicOk(false)
        addViolation('Microphone access denied or disconnected', 'mic_denied')
      }
    }
    startMic()
    return () => {
      active = false
      micStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Monitor camera track health ────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (submitted) return
      const stream = cameraStreamRef.current
      if (!stream || stream.getVideoTracks().some(t => t.readyState === 'ended')) {
        setCameraOk(false)
        addViolation('Camera disconnected during exam', 'camera_disconnected')
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [submitted, addViolation])

  // ── TAB SWITCH → AUTO SUBMIT ───────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submitCalledRef.current) {
        // Log first
        resultsAPI.logActivity({
          exam_id: parseInt(examId),
          activity_type: 'tab_switch',
          details: 'Student switched tab or minimised window',
        }).catch(() => {})
        // Auto-submit immediately
        submitExam('tab')
      }
    }

    const handleFullscreen = () => {
      if (!document.fullscreenElement && !submitCalledRef.current) {
        resultsAPI.logActivity({
          exam_id: parseInt(examId),
          activity_type: 'fullscreen_exit',
          details: 'Student exited fullscreen',
        }).catch(() => {})
        addViolation('You exited fullscreen mode. This is not allowed.', 'fullscreen_exit')
        // Try to re-enter fullscreen
        document.documentElement.requestFullscreen?.().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreen)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('fullscreenchange', handleFullscreen)
    }
  }, [examId, addViolation, submitExam])

  // ── Disable right-click, copy, cut, paste ─────────────────────────────────
  useEffect(() => {
    const prevent = e => e.preventDefault()
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('copy', prevent)
    document.addEventListener('cut', prevent)
    document.addEventListener('paste', prevent)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('copy', prevent)
      document.removeEventListener('cut', prevent)
      document.removeEventListener('paste', prevent)
    }
  }, [])

  // ── Disable keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKey = e => {
      // Block: F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P, Alt+Tab
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['u','s','p'].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault()
        addViolation(`Blocked keyboard shortcut: ${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`, 'keyboard_shortcut')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [addViolation])

  // ── Autosave every 10 seconds ──────────────────────────────────────────────
  useEffect(() => {
    if (questions.length === 0 || submitted) return
    autosaveRef.current = setInterval(() => {
      const payload = Object.entries(answers).map(([qId, ans]) => ({
        question_id: parseInt(qId),
        selected_answer: ans,
      }))
      resultsAPI.autosave({ exam_id: parseInt(examId), answers: payload }).catch(() => {})
    }, 10000)
    return () => clearInterval(autosaveRef.current)
  }, [answers, questions, submitted, examId])

  const handleAnswer = (qId, letter) => setAnswers(p => ({ ...p, [qId]: letter }))
  const answeredCount = Object.keys(answers).length
  const current = questions[currentIdx]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !duration) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium">Loading exam…</p>
        </div>
      </div>
    )
  }

  // ── Submitted ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white animate-fade-in">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">Exam Submitted!</h1>
          <p className="text-slate-400">Redirecting to your results…</p>
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mt-6" />
        </div>
      </div>
    )
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div id="exam-engine" className="min-h-screen bg-slate-950 text-white flex flex-col"
      onContextMenu={e => e.preventDefault()}>

      {/* ── Warning overlay ───────────────────────────────────────────────── */}
      {showWarning && !submitCalledRef.current && (
        <WarningOverlay
          count={violations}
          reason={warningReason}
          onDismiss={() => setShowWarning(false)}
        />
      )}

      {/* ── Camera overlay ────────────────────────────────────────────────── */}
      <CameraOverlay videoRef={videoRef} cameraOk={cameraOk} micOk={micOk} />

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold">Q</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold truncate max-w-48">{examInfo?.title || 'Secure Exam'}</p>
            <p className="text-xs text-slate-400">{questions.length} Questions · {user?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Violation counter */}
          {violations > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 border border-red-700
              rounded-lg text-red-400 text-xs font-medium animate-pulse">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {violations}/{MAX_WARNINGS} warnings
            </div>
          )}

          {/* Camera + Mic status (header) */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cameraOk ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} title="Camera" />
            <div className={`w-2 h-2 rounded-full ${micOk ? 'bg-blue-400 animate-pulse' : 'bg-red-500'}`} title="Mic" />
          </div>

          {duration && (
            <CountdownTimer totalSeconds={duration} onExpire={() => submitExam('timer')} />
          )}
        </div>
      </header>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>{Math.round((answeredCount / Math.max(questions.length,1)) * 100)}% complete</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div className="bg-gradient-to-r from-primary-500 to-violet-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(answeredCount / Math.max(questions.length,1)) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Question panel ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {current && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-primary-900/50 border border-primary-700 rounded-lg text-primary-300 text-sm font-semibold">
                  Q{currentIdx + 1}/{questions.length}
                </span>
                <span className="text-xs text-slate-500">{current.marks} mark{current.marks > 1 ? 's' : ''}</span>
                {answers[current.id] && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircleIcon className="w-4 h-4" /> Answered
                  </span>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <p className="text-lg font-medium text-white leading-relaxed">{current.question_text}</p>
              </div>

              <div className="space-y-3">
                {[['A', current.option_a],['B', current.option_b],['C', current.option_c],['D', current.option_d]].map(([l, t]) => (
                  <OptionButton key={l} letter={l} text={t}
                    selected={answers[current.id] === l}
                    onClick={() => handleAnswer(current.id, l)} />
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700
                    text-slate-300 font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeftIcon className="w-4 h-4" /> Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all">
                    Next <ChevronRightIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setShowConfirm(true)} disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700
                      text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30">
                    <CheckCircleIcon className="w-4 h-4" /> Submit Exam
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── Right sidebar: question grid ──────────────────────────────── */}
        <aside className="hidden lg:block w-64 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrentIdx(i)}
                className={`w-full aspect-square rounded-lg text-xs font-bold transition-all
                  ${i === currentIdx ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                    : answers[q.id] ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {i + 1}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {[['bg-emerald-700','Answered'],['bg-slate-800','Unanswered'],['bg-primary-600 ring-2 ring-primary-400','Current']].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-2 text-xs text-slate-400">
                <div className={`w-4 h-4 rounded ${cls} flex-shrink-0`} /> {label}
              </div>
            ))}
          </div>

          {/* Security status */}
          <div className="mt-4 p-3 bg-slate-800 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1"><CameraIcon className="w-3 h-3" /> Camera</span>
              <span className={cameraOk ? 'text-emerald-400' : 'text-red-400'}>{cameraOk ? '● Active' : '● Off'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1"><MicrophoneIcon className="w-3 h-3" /> Mic</span>
              <span className={micOk ? 'text-blue-400' : 'text-red-400'}>{micOk ? '● Active' : '● Off'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1"><ShieldExclamationIcon className="w-3 h-3" /> Warnings</span>
              <span className={violations > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{violations}/{MAX_WARNINGS}</span>
            </div>
          </div>

          <button onClick={() => setShowConfirm(true)} className="w-full mt-4 btn-primary text-sm">
            Submit Exam
          </button>
        </aside>
      </div>

      {/* Mobile submit */}
      <div className="lg:hidden p-4 bg-slate-900 border-t border-slate-800">
        <button onClick={() => setShowConfirm(true)}
          className="w-full btn-primary flex items-center justify-center gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          Submit Exam ({answeredCount}/{questions.length} answered)
        </button>
      </div>

      {showConfirm && (
        <ConfirmSubmitModal
          answered={answeredCount}
          total={questions.length}
          onConfirm={() => submitExam('manual')}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
