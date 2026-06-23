import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// ── Auth Pages ────────────────────────────────────────────────────────────────
import StudentLogin from './pages/auth/StudentLogin'
import TeacherLogin from './pages/auth/TeacherLogin'
import AdminLogin   from './pages/auth/AdminLogin'
import Register     from './pages/auth/Register'
import LandingPage  from './pages/LandingPage'

// ── Admin (super) Pages ───────────────────────────────────────────────────────
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard'
import AdminSettings       from './pages/admin/Settings'

// ── Teacher Pages (reuse existing admin components) ───────────────────────────
import TeacherDashboard  from './pages/admin/Dashboard'
import ExamManagement    from './pages/admin/ExamManagement'
import QuestionBank      from './pages/admin/QuestionBank'
import StudentManagement from './pages/admin/StudentManagement'
import EmailManagement   from './pages/admin/EmailManagement'
import TeacherResults    from './pages/admin/Results'
import Analytics         from './pages/admin/Analytics'
import TeacherSettings   from './pages/admin/Settings'

// ── Student Pages ─────────────────────────────────────────────────────────────
import StudentDashboard from './pages/student/StudentDashboard'
import Verification     from './pages/student/Verification'
import ExamEngine       from './pages/student/ExamEngine'
import StudentResults   from './pages/student/StudentResults'

// ── Layouts ───────────────────────────────────────────────────────────────────
import AdminLayout   from './components/common/AdminLayout'
import TeacherLayout from './components/common/TeacherLayout'
import StudentLayout from './components/common/StudentLayout'
import ForcePasswordChange from './components/common/ForcePasswordChange'

// ── Route Guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) {
    // Redirect to correct login page based on which roles are allowed
    if (allowedRoles?.includes('admin'))   return <Navigate to="/admin/login"   replace />
    if (allowedRoles?.includes('teacher')) return <Navigate to="/teacher/login" replace />
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to correct home
    if (user.role === 'admin')    return <Navigate to="/admin"   replace />
    if (user.role === 'teacher')  return <Navigate to="/teacher" replace />
    if (user.role === 'student')  return <Navigate to="/student" replace />
    return <Navigate to="/login" replace />
  }

  return (
    <ForcePasswordChange>
      {children}
    </ForcePasswordChange>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* ── Root ─────────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />

            {/* ── Public Auth ──────────────────────────────────────── */}
            <Route path="/login"         element={<StudentLogin />} />
            <Route path="/register"      element={<Register />} />
            <Route path="/teacher/login" element={<TeacherLogin />} />
            <Route path="/admin/login"   element={<AdminLogin />} />

            {/* QR / email exam access */}
            <Route path="/exam/access" element={<Verification />} />

            {/* ── Super Admin Routes ────────────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="staff"             element={<SuperAdminDashboard />} />
              <Route path="exams"             element={<ExamManagement />} />
              <Route path="questions/:examId" element={<QuestionBank />} />
              <Route path="students"          element={<StudentManagement />} />
              <Route path="email/:examId"     element={<EmailManagement />} />
              <Route path="results/:examId"   element={<TeacherResults />} />
              <Route path="analytics"         element={<Analytics />} />
              <Route path="settings"          element={<AdminSettings />} />
            </Route>

            {/* ── Teacher Routes ────────────────────────────────────── */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherDashboard />} />
              <Route path="exams"              element={<ExamManagement />} />
              <Route path="questions/:examId"  element={<QuestionBank />} />
              <Route path="students"           element={<StudentManagement />} />
              <Route path="email/:examId"      element={<EmailManagement />} />
              <Route path="results/:examId"    element={<TeacherResults />} />
              <Route path="analytics"          element={<Analytics />} />
              <Route path="settings"           element={<TeacherSettings />} />
            </Route>

            {/* ── Student Routes ────────────────────────────────────── */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index   element={<StudentDashboard />} />
              <Route path="results" element={<StudentResults />} />
            </Route>

            {/* Exam engine — full screen, no layout */}
            <Route path="/student/exam/:examId" element={
              <ProtectedRoute allowedRoles={['student']}>
                <ExamEngine />
              </ProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
