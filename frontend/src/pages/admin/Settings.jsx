import { useState, useEffect } from 'react'
import { authAPI } from '../../services/api'
import {
  EnvelopeIcon, KeyIcon, CheckCircleIcon,
  ExclamationCircleIcon, ShieldCheckIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function errMsg(err) {
  const d = err?.response?.data?.detail
  if (!d) return err?.message || 'Something went wrong'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => e.msg || JSON.stringify(e)).join(', ')
  return JSON.stringify(d)
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({ smtp_email: '', smtp_configured: false })
  const [form, setForm] = useState({ smtp_email: '', smtp_password: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    authAPI.getSmtpSettings()
      .then(r => {
        setSettings(r.data)
        setForm(f => ({ ...f, smtp_email: r.data.smtp_email || '' }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setTestResult(null)
    try {
      const { data } = await authAPI.saveSmtpSettings(form)
      toast.success(data.message)
      setSettings(s => ({
        ...s,
        smtp_email: form.smtp_email,
        smtp_configured: !!form.smtp_email,
      }))
      if (!form.smtp_email) setForm({ smtp_email: '', smtp_password: '' })
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { data } = await authAPI.testSmtpSettings()
      setTestResult(data)
      if (data.ok) toast.success(`SMTP OK — using ${data.using}`)
      else toast.error(`SMTP failed: ${data.error}`)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setTesting(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Revert to system email? Your Gmail settings will be removed.')) return
    setSaving(true)
    try {
      const { data } = await authAPI.saveSmtpSettings({ smtp_email: '', smtp_password: '' })
      toast.success(data.message)
      setSettings(s => ({ ...s, smtp_email: '', smtp_configured: false }))
      setForm({ smtp_email: '', smtp_password: '' })
      setTestResult(null)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure your email account for sending exam invitations
        </p>
      </div>

      {/* Current status */}
      <div className={`card p-4 flex items-center gap-4 ${
        settings.smtp_configured
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
      }`}>
        {settings.smtp_configured ? (
          <CheckCircleIcon className="w-8 h-8 text-emerald-600 flex-shrink-0" />
        ) : (
          <ExclamationCircleIcon className="w-8 h-8 text-amber-500 flex-shrink-0" />
        )}
        <div>
          <p className={`font-semibold ${settings.smtp_configured ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
            {settings.smtp_configured
              ? `Sending from: ${settings.smtp_email}`
              : 'Using system default email'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {settings.smtp_configured
              ? 'All exam invitations will be sent from your Gmail account'
              : 'Set your own Gmail below to send emails from your account'}
          </p>
        </div>
      </div>

      {/* SMTP Settings Form */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <EnvelopeIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Gmail SMTP Settings</h2>
            <p className="text-xs text-slate-500">Enter your Gmail and App Password</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Your Gmail Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="yourname@gmail.com"
              value={form.smtp_email}
              onChange={e => setForm({ ...form, smtp_email: e.target.value })}
            />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <KeyIcon className="w-3.5 h-3.5" />
              Gmail App Password
            </label>
            <input
              type="password"
              className="input-field font-mono"
              placeholder="xxxx xxxx xxxx xxxx"
              value={form.smtp_password}
              onChange={e => setForm({ ...form, smtp_password: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-1">
              Not your Gmail password — create an App Password at{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:underline"
              >
                myaccount.google.com/apppasswords
              </a>
            </p>
          </div>

          {/* How to get App Password */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm space-y-1">
            <p className="font-semibold text-blue-800 dark:text-blue-300">How to get a Gmail App Password:</p>
            <ol className="list-decimal list-inside text-blue-700 dark:text-blue-400 space-y-0.5 text-xs">
              <li>Go to Google Account → Security</li>
              <li>Enable 2-Step Verification</li>
              <li>Search "App passwords" → Select app: Mail</li>
              <li>Copy the 16-character password here</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            {settings.smtp_configured && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50
                  dark:hover:bg-red-900/20 transition-all"
              >
                Revert to Default
              </button>
            )}
          </div>
        </form>

        {/* Test result */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-xl border ${
            testResult.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          }`}>
            {testResult.ok ? (
              <p className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                Connection successful! Using: <span className="font-mono">{testResult.using}</span>
              </p>
            ) : (
              <div className="text-red-700 dark:text-red-300">
                <p className="font-medium flex items-center gap-2">
                  <ExclamationCircleIcon className="w-5 h-5" />
                  Connection failed
                </p>
                <p className="text-sm mt-1 font-mono">{testResult.error}</p>
                <p className="text-xs mt-1 text-red-500">{testResult.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
