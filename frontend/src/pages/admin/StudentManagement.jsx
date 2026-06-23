import { useState, useEffect, useRef } from 'react'
import { studentsAPI, classroomsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  PlusIcon, TrashIcon, ArrowUpTrayIcon, UserGroupIcon,
  AcademicCapIcon, ChevronRightIcon, XMarkIcon,
  PencilIcon, ArrowLeftIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { analyticsAPI } from '../../services/api'
import { format } from 'date-fns'

// ── Student Details Modal ─────────────────────────────────────────────────────
function StudentDetailsModal({ studentId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)

  useEffect(() => {
    analyticsAPI.studentExamHistory(studentId)
      .then(res => setData(res.data))
      .catch(err => toast.error('Failed to load student details'))
      .finally(() => setLoading(false))
  }, [studentId])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.trim().length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPwd(true)
    try {
      await studentsAPI.resetPassword(studentId, { password: newPassword })
      toast.success('Student password reset successfully!')
      setNewPassword('')
      setShowResetForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              {data?.student?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-none mb-1">
                {data?.student?.name || 'Loading...'}
              </h2>
              <p className="text-xs text-slate-500">{data?.student?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Actions / Reset Password section */}
          {!loading && data?.student && (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Reset Student Password</h3>
                  <p className="text-xs text-slate-500">Change password for this student account</p>
                </div>
                <button
                  onClick={() => setShowResetForm(!showResetForm)}
                  className="btn-primary py-1.5 px-3 text-xs bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white"
                >
                  {showResetForm ? 'Cancel' : 'Reset Password'}
                </button>
              </div>
              {showResetForm && (
                <form onSubmit={handleResetPassword} className="mt-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">New Password</label>
                    <input
                      type="password"
                      className="input-field py-1.5 px-3 text-sm"
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingPwd}
                    className="btn-primary py-1.5 px-4 text-xs h-[38px] flex items-center justify-center"
                  >
                    {savingPwd ? 'Saving...' : 'Save'}
                  </button>
                </form>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data?.history?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 dark:text-slate-400">No exams attended under you yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Exam History</h3>
              {data.history.map((exam, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1">{exam.exam_title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Submitted: {format(new Date(exam.submitted_at), 'dd MMM yyyy, HH:mm')}</span>
                      <span>•</span>
                      <span className={exam.pass_fail_status === 'Pass' ? 'text-emerald-600' : 'text-red-500 font-medium'}>
                        {exam.pass_fail_status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {exam.score} <span className="text-sm font-medium text-slate-400">/ {exam.total_marks}</span>
                    </p>
                    <p className="text-xs font-bold text-primary-600">Grade {exam.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Create Class Modal ────────────────────────────────────────────────────────
function CreateClassModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', section: '', description: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await classroomsAPI.create(form)
      toast.success('Class created!')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create class')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Create New Class</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Class Name *</label>
            <input className="input-field" placeholder="e.g. CSE-A 2024, BCA 2nd Year"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Section</label>
            <input className="input-field" placeholder="e.g. Morning, Evening, A, B"
              value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Optional notes..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Student Modal ─────────────────────────────────────────────────────────
function AddStudentModal({ classId, className, onClose, onSave }) {
  const [tab, setTab] = useState('single') // 'single' | 'bulk' | 'existing'
  const [form, setForm] = useState({ name: '', email: '', roll_number: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [allStudents, setAllStudents] = useState([])
  const [search, setSearch] = useState('')
  const fileRef = useRef()
  const [uploadResult, setUploadResult] = useState(null)

  useEffect(() => {
    if (tab === 'existing') {
      studentsAPI.list().then(r => setAllStudents(r.data)).catch(() => {})
    }
  }, [tab])

  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: student } = await studentsAPI.create({ ...form, class_id: classId })
      toast.success(`${student.name} added to ${className}!`)
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create student')
    } finally { setLoading(false) }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const { data } = await studentsAPI.bulkUpload(file, classId)
      setUploadResult(data)
      toast.success(`${data.created_count} students added!`)
      onSave()
    } catch { toast.error('Upload failed') }
    finally { setLoading(false) }
  }

  const handleAddExisting = async (studentId) => {
    try {
      await classroomsAPI.addStudent(classId, studentId)
      toast.success('Student added to class!')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const unassigned = allStudents.filter(s =>
    (!s.class_id || s.class_id !== classId) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Add Students</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Class: <span className="font-medium text-primary-600">{className}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {[['single', 'Add New'], ['bulk', 'Bulk CSV'], ['existing', 'From Existing']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Single Student */}
          {tab === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input-field" placeholder="Student name"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Roll Number</label>
                  <input className="input-field" placeholder="CS2024001"
                    value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input-field" placeholder="student@email.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input-field" placeholder="Min. 8 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          )}

          {/* Bulk Upload */}
          {tab === 'bulk' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">CSV Format</p>
                <code className="text-xs text-blue-600 dark:text-blue-400 block">name,email,roll_number</code>
                <code className="text-xs text-blue-600 dark:text-blue-400 block">John Doe,john@email.com,CS001</code>
                <p className="text-xs text-blue-500 mt-1">Passwords are auto-generated and shown below</p>
              </div>
              <div onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8
                  text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50
                  dark:hover:bg-primary-900/10 transition-all">
                <ArrowUpTrayIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700 dark:text-slate-300">Click to upload CSV</p>
                <p className="text-sm text-slate-400 mt-1">Students will be added to {className}</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
              {loading && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </div>
              )}
              {uploadResult && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {uploadResult.created_count} students added to {className}
                  </p>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {uploadResult.students?.map(s => (
                      <div key={s.id} className="text-xs bg-white dark:bg-slate-800 rounded px-3 py-1.5 flex justify-between">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                        <span className="font-mono text-primary-600">{s.temp_password}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={onClose} className="btn-secondary w-full">Close</button>
            </div>
          )}

          {/* Add Existing Students */}
          {tab === 'existing' && (
            <div className="space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input-field pl-9" placeholder="Search students..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {unassigned.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">No unassigned students found</p>
                ) : unassigned.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </div>
                    <button onClick={() => handleAddExisting(s.id)}
                      className="btn-primary py-1.5 px-3 text-xs">Add</button>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="btn-secondary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentManagement() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [classStudents, setClassStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [modal, setModal] = useState(null) // 'createClass' | 'addStudent' | {type: 'studentDetails', id: ...}
  const [search, setSearch] = useState('')

  const loadClasses = () => {
    setLoading(true)
    classroomsAPI.list()
      .then(r => setClasses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadClassStudents = (cls) => {
    setSelectedClass(cls)
    setStudentsLoading(true)
    classroomsAPI.getStudents(cls.id)
      .then(r => setClassStudents(r.data))
      .catch(() => setClassStudents([]))
      .finally(() => setStudentsLoading(false))
  }

  useEffect(() => { loadClasses() }, [])

  const handleDeleteClass = async (cls) => {
    if (!confirm(`Delete class "${cls.name}"? Students will remain but be unassigned.`)) return
    try {
      await classroomsAPI.delete(cls.id)
      toast.success('Class deleted')
      if (selectedClass?.id === cls.id) setSelectedClass(null)
      loadClasses()
    } catch { toast.error('Failed') }
  }

  const handleRemoveStudent = async (student) => {
    if (!confirm(`Remove ${student.name} from this class?`)) return
    try {
      await classroomsAPI.removeStudent(selectedClass.id, student.id)
      toast.success(`${student.name} removed`)
      loadClassStudents(selectedClass)
      loadClasses()
    } catch { toast.error('Failed') }
  }

  const handleDeleteStudent = async (student) => {
    if (!confirm(`Permanently delete ${student.name}?`)) return
    try {
      await studentsAPI.delete(student.id)
      toast.success('Student deleted')
      loadClassStudents(selectedClass)
      loadClasses()
    } catch { toast.error('Failed') }
  }

  const filtered = classStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {classes.length} classes · {classes.reduce((a, c) => a + c.student_count, 0)} total students
          </p>
        </div>
        <button onClick={() => setModal('createClass')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Create Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Class List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-1">
            Your Classes
          </h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="card text-center py-10">
              <AcademicCapIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">No classes yet</p>
              <p className="text-xs text-slate-400 mb-4">Create a class to start adding students</p>
              <button onClick={() => setModal('createClass')} className="btn-primary text-sm">
                Create First Class
              </button>
            </div>
          ) : (
            classes.map(cls => (
              <div key={cls.id}
                onClick={() => loadClassStudents(cls)}
                className={`card cursor-pointer transition-all hover:shadow-md group p-4 ${
                  selectedClass?.id === cls.id
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/10'
                    : 'hover:border-primary-200 dark:hover:border-primary-800'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedClass?.id === cls.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <AcademicCapIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{cls.name}</p>
                      <p className="text-xs text-slate-500">
                        {cls.section && <span className="mr-2">{cls.section}</span>}
                        <span className="font-medium text-primary-600">{cls.student_count} students</span>
                        {user?.role === 'admin' && cls.created_by_name && (
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]">
                            By {cls.created_by_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls) }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400
                        hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform ${
                      selectedClass?.id === cls.id ? 'rotate-90 text-primary-600' : ''
                    }`} />
                  </div>
                </div>
                {cls.description && (
                  <p className="text-xs text-slate-400 mt-2 truncate">{cls.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* RIGHT — Students in Selected Class */}
        <div className="lg:col-span-2">
          {!selectedClass ? (
            <div className="card text-center py-16 h-full flex flex-col items-center justify-center">
              <UserGroupIcon className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Select a Class
              </h3>
              <p className="text-sm text-slate-400">Click on a class from the left to view its students</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Class Header */}
              <div className="card p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedClass.name}</h2>
                    <p className="text-sm text-slate-500">
                      {selectedClass.section && `${selectedClass.section} · `}
                      {classStudents.length} students enrolled
                    </p>
                  </div>
                  <button onClick={() => setModal('addStudent')} className="btn-primary flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Add Students
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input-field pl-9" placeholder="Search students..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Student list */}
              {studentsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="card text-center py-12">
                  <UserGroupIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {search ? 'No matches found' : 'No Students in This Class'}
                  </p>
                  <p className="text-xs text-slate-400 mb-4">Add students individually, via CSV, or move existing ones</p>
                  <button onClick={() => setModal('addStudent')} className="btn-primary text-sm">
                    Add Students
                  </button>
                </div>
              ) : (
                <div className="card overflow-hidden p-0">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">#</th>
                        <th className="table-header">Name</th>
                        <th className="table-header">Email</th>
                        <th className="table-header">Roll No.</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, i) => (
                        <tr key={s.id} onClick={() => setModal({type: 'studentDetails', id: s.id})} className="table-row cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="table-cell text-slate-400 text-xs">{i + 1}</td>
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500
                                flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                            </div>
                          </td>
                          <td className="table-cell text-slate-500 text-sm">{s.email}</td>
                          <td className="table-cell">
                            {s.roll_number
                              ? <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-mono">{s.roll_number}</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleRemoveStudent(s)}
                                title="Remove from class"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                                <ArrowLeftIcon className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteStudent(s)}
                                title="Delete student permanently"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'createClass' && (
        <CreateClassModal
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); loadClasses() }}
        />
      )}
      {modal === 'addStudent' && selectedClass && (
        <AddStudentModal
          classId={selectedClass.id}
          className={selectedClass.name}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null)
            loadClassStudents(selectedClass)
            loadClasses()
          }}
        />
      )}
      {modal?.type === 'studentDetails' && (
        <StudentDetailsModal
          studentId={modal.id}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
