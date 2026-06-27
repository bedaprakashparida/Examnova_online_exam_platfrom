import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { invitationsAPI, examsAPI, classroomsAPI } from '../../services/api'
import {
  QrCodeIcon, EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon,
  ArrowPathIcon, PaperAirplaneIcon, ExclamationCircleIcon,
  AcademicCapIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

/** Safely extract a string message from any axios error */
function errMsg(err) {
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => e.msg || JSON.stringify(e)).join(', ')
  return JSON.stringify(d)
}

export default function EmailManagement() {
  const { examId } = useParams()
  const [exam, setExam] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)   // null = All students
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedQR, setSelectedQR] = useState(null)

  const load = async () => {
    try {
      const [examRes, invRes, classRes] = await Promise.all([
        examsAPI.get(examId),
        invitationsAPI.getByExam(examId),
        classroomsAPI.list(),
      ])
      setExam(examRes.data)
      setInvitations(invRes.data)
      setClasses(classRes.data)
    } catch (err) {
      toast.error('Failed to load: ' + errMsg(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [examId])

  // Filter displayed invitations by selected class
  const displayed = selectedClassId
    ? invitations.filter(inv => inv.student_class_id === selectedClassId)
    : invitations

  const handleGenerateQR = async () => {
    setGenerating(true)
    try {
      const { data } = await invitationsAPI.generateAll(examId, selectedClassId)
      const classLabel = selectedClassId
        ? classes.find(c => c.id === selectedClassId)?.name || 'selected class'
        : 'all students'
      toast.success(`${data.created} QR codes generated for ${classLabel}!`)
      load()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setGenerating(false)
    }
  }

  const handleSendAll = async (pendingOnly = false) => {
    const classLabel = selectedClassId
      ? classes.find(c => c.id === selectedClassId)?.name || 'selected class'
      : 'all students'
    const typeLabel = pendingOnly ? 'pending' : 'all';
    if (!confirm(`Send invitation emails to ${typeLabel} students in ${classLabel}?`)) return
    setSending(true)
    try {
      const { data } = await invitationsAPI.sendEmails(examId, selectedClassId, pendingOnly)
      toast.success(data.message || `Sending to ${data.count} students…`)
      setTimeout(load, 4000)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (invId) => {
    try {
      const { data } = await invitationsAPI.resendSingle(invId)
      toast.success(`Sent! (from: ${data.sent_from})`)
      load()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const sentCount   = displayed.filter(i => i.email_sent).length
  const hasQR       = displayed.some(i => i.qr_code)
  const pendingCount = displayed.length - sentCount

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/exams" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email & QR Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exam?.title}</p>
        </div>
      </div>

      {/* ── Class Filter ── */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <FunnelIcon className="w-4 h-4" />
            Filter by Class:
          </div>
          {/* All button */}
          <button
            onClick={() => setSelectedClassId(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedClassId === null
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Students
          </button>
          {/* Class buttons */}
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedClassId === cls.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <AcademicCapIcon className="w-3.5 h-3.5" />
              {cls.name}
              {cls.section && <span className="opacity-70">· {cls.section}</span>}
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                selectedClassId === cls.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {cls.student_count}
              </span>
            </button>
          ))}
          {classes.length === 0 && (
            <span className="text-xs text-slate-400">
              No classes yet — go to Students to create classes
            </span>
          )}
        </div>
        {selectedClassId && (
          <p className="text-xs text-primary-600 dark:text-primary-400 mt-2 flex items-center gap-1">
            <ExclamationCircleIcon className="w-4 h-4" />
            Actions below apply only to <strong>{classes.find(c => c.id === selectedClassId)?.name}</strong>
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{displayed.length}</p>
          <p className="text-sm text-slate-500 mt-1">
            {selectedClassId ? 'Class Students' : 'Total Students'}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-600">{sentCount}</p>
          <p className="text-sm text-slate-500 mt-1">Emails Sent</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-sm text-slate-500 mt-1">Pending</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateQR}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            <QrCodeIcon className="w-4 h-4" />
            {generating ? 'Generating…' : hasQR ? 'Regenerate QR Codes' : 'Generate QR Codes'}
          </button>

          <button
            onClick={() => handleSendAll(true)}
            disabled={sending || !hasQR || pendingCount === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send to Pending Only'}
          </button>

          <button
            onClick={() => handleSendAll(false)}
            disabled={sending || !hasQR}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {sending ? 'Sending…' : 'Force Resend to All'}
          </button>
        </div>

        {!hasQR && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
            <ExclamationCircleIcon className="w-4 h-4" />
            Generate QR codes first, then send emails.
          </p>
        )}
      </div>

      {/* Invitations table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card text-center py-12">
          <EnvelopeIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">
            {selectedClassId
              ? 'No students in this class have invitations yet. Generate QR codes to add them.'
              : 'No students found. Add students first, then generate QR codes.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Roll No.</th>
                  <th className="table-header">Class</th>
                  <th className="table-header">QR Code</th>
                  <th className="table-header">Email Status</th>
                  <th className="table-header">Access</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((inv) => {
                  const cls = classes.find(c => c.id === inv.student_class_id)
                  return (
                    <tr key={inv.id} className="table-row">
                      <td className="table-cell font-medium text-slate-900 dark:text-white">
                        {inv.student_name}
                      </td>
                      <td className="table-cell text-slate-500 text-sm">{inv.student_email}</td>
                      <td className="table-cell text-slate-500 text-sm">{inv.student_roll || '—'}</td>

                      {/* Class badge */}
                      <td className="table-cell">
                        {cls ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20
                            text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium w-fit">
                            <AcademicCapIcon className="w-3 h-3" />
                            {cls.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* QR code preview */}
                      <td className="table-cell">
                        {inv.qr_code ? (
                          <button
                            onClick={() => setSelectedQR(inv)}
                            className="w-12 h-12 border-2 border-slate-200 dark:border-slate-700 rounded-lg
                              overflow-hidden hover:border-primary-400 transition-all cursor-pointer"
                          >
                            <img src={inv.qr_code} alt="QR" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Not generated</span>
                        )}
                      </td>

                      {/* Email status */}
                      <td className="table-cell">
                        {inv.email_sent ? (
                          <span className="badge-pass flex items-center gap-1 w-fit">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Sent
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold
                            bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Used status */}
                      <td className="table-cell">
                        {inv.is_used ? (
                          <span className="badge-pass">✓ Accessed</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800
                            text-slate-500 font-semibold">Not yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="table-cell">
                        <button
                          onClick={() => handleResend(inv.id)}
                          disabled={!inv.qr_code}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                            bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400
                            hover:bg-violet-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ArrowPathIcon className="w-3.5 h-3.5" /> Resend
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedQR(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-slate-900 dark:text-white text-center mb-1">
              {selectedQR.student_name}
            </h3>
            <p className="text-sm text-slate-500 text-center mb-4">{selectedQR.student_email}</p>
            <img
              src={selectedQR.qr_code}
              alt="QR Code"
              className="w-full max-w-xs mx-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2"
            />
            <p className="text-xs text-slate-400 text-center mt-3 break-all">{selectedQR.unique_exam_link}</p>
            <div className="flex gap-3 mt-4">
              <a
                href={selectedQR.qr_code}
                download={`qr_${selectedQR.student_name}.png`}
                className="btn-secondary flex-1 text-center text-sm"
              >
                Download QR
              </a>
              <button onClick={() => setSelectedQR(null)} className="btn-primary flex-1 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
