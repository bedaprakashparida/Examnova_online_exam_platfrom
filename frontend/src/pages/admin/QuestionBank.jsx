import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { questionsAPI, examsAPI } from '../../services/api'
import { PlusIcon, PencilIcon, TrashIcon, ArrowUpTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const defaultQ = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', marks: 1 }

function QuestionModal({ question, examId, onClose, onSave }) {
  const [form, setForm] = useState(question || defaultQ)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (question) {
        await questionsAPI.update(question.id, form)
        toast.success('Question updated!')
      } else {
        await questionsAPI.add(examId, form)
        toast.success('Question added!')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const options = ['A', 'B', 'C', 'D']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">
            {question ? 'Edit Question' : 'Add Question'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Question Text *</label>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Enter your question here..."
              value={form.question_text}
              onChange={(e) => setForm({...form, question_text: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => (
              <div key={opt}>
                <label className={`label flex items-center gap-1.5`}>
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                    ${form.correct_answer === opt
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>{opt}</span>
                  Option {opt} {form.correct_answer === opt && <span className="text-emerald-500 text-xs">(Correct)</span>}
                </label>
                <input className="input-field" placeholder={`Option ${opt}`}
                  value={form[`option_${opt.toLowerCase()}`]}
                  onChange={(e) => setForm({...form, [`option_${opt.toLowerCase()}`]: e.target.value})} required />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Correct Answer *</label>
              <select className="input-field" value={form.correct_answer}
                onChange={(e) => setForm({...form, correct_answer: e.target.value})}>
                {options.map(o => <option key={o} value={o}>Option {o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Marks</label>
              <input type="number" className="input-field" min={1} max={10}
                value={form.marks} onChange={(e) => setForm({...form, marks: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : question ? 'Update' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function QuestionBank() {
  const { examId } = useParams()
  const [questions, setQuestions] = useState([])
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = () => {
    Promise.all([questionsAPI.list(examId), examsAPI.get(examId)])
      .then(([qRes, eRes]) => { setQuestions(qRes.data); setExam(eRes.data) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [examId])

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return
    try {
      await questionsAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await questionsAPI.bulkUpload(examId, file)
      toast.success(`Uploaded ${data.created} questions`)
      if (data.errors.length > 0) toast.error(`${data.errors.length} errors in CSV`)
      load()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); fileRef.current.value = '' }
  }

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/admin/exams" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">{exam?.title} — {questions.length} questions · {totalMarks} total marks</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2">
            <ArrowUpTrayIcon className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'CSV Upload'}
          </button>
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Question
          </button>
        </div>
      </div>

      {/* CSV Template hint */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">📋 CSV Format:</p>
        <code className="text-xs text-blue-600 dark:text-blue-400">
          question_text, option_a, option_b, option_c, option_d, correct_answer, marks
        </code>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-400 mb-4">No questions yet. Add your first question or upload a CSV file.</p>
          <button onClick={() => setModal('new')} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center
                  justify-center text-primary-700 dark:text-primary-400 font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white mb-3">{q.question_text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]].map(([letter, text]) => (
                      <div key={letter} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        ${q.correct_answer === letter
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-medium'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0
                          ${q.correct_answer === letter
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-500'
                          }`}>{letter}</span>
                        {text}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400">Marks: <strong>{q.marks}</strong></span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Answer: {q.correct_answer}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setModal(q)}
                    className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(q.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <QuestionModal
          question={modal === 'new' ? null : modal}
          examId={examId}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
