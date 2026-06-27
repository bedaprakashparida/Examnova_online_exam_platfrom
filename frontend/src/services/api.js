import axios from 'axios'

let API_BASE = import.meta.env.VITE_API_URL

if (!API_BASE) {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    API_BASE = 'https://examnova-backend.vercel.app/api'
  } else {
    API_BASE = '/api'
  }
}


const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — redirect to correct login page based on role
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
    if (error.response?.status === 401 && !isAuthEndpoint) {
      const stored = localStorage.getItem('user')
      const role = stored ? JSON.parse(stored)?.role : null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (role === 'admin')   window.location.href = '/admin/login'
      else if (role === 'teacher') window.location.href = '/teacher/login'
      else                    window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  // Shared OTP login (teacher + admin)
  adminRequestOtp:   (data) => api.post('/auth/login/admin/request-otp', data),
  adminVerifyOtp:    (data) => api.post('/auth/login/admin/verify-otp', data),
  resendOtp:         (data) => api.post('/auth/resend-otp', data),

  // Register (teacher or admin, role in body)
  adminRegisterSendOtp:   (data) => api.post('/auth/register/admin/send-otp', data),
  adminRegisterVerifyOtp: (data) => api.post('/auth/register/admin/verify-otp', data),

  // Change password (force reset flow)
  changePassword:         (data) => api.post('/auth/change-password', data),

  // Forgot password flow
  forgotPasswordRequestOtp: (data) => api.post('/auth/forgot-password/request-otp', data),
  forgotPasswordReset:      (data) => api.post('/auth/forgot-password/reset', data),

  // Student
  loginStudent:   (data)  => api.post('/auth/login/student', data),
  examTokenLogin: (token) => api.post('/auth/exam-token-login', { token }),

  // Profile + SMTP
  getMe:            ()     => api.get('/auth/me'),
  getSmtpSettings:  ()     => api.get('/auth/smtp-settings'),
  saveSmtpSettings: (data) => api.put('/auth/smtp-settings', data),
  testSmtpSettings: ()     => api.post('/auth/smtp-settings/test'),

  // Super Admin: teacher management
  listTeachers:       ()          => api.get('/auth/admin/teachers'),
  adminCreateTeacher: (data)      => api.post('/auth/admin/teachers', data),
  deleteTeacher:      (id)        => api.delete(`/auth/admin/teachers/${id}`),
  changeTeacherRole:  (id, role)  => api.patch(`/auth/admin/teachers/${id}/role`, { teacher_role: role }),
}



// ── Exams ─────────────────────────────────────────────────────────────────────
export const examsAPI = {
  create: (data) => api.post('/exams/', data),
  list: () => api.get('/exams/'),
  get: (id) => api.get(`/exams/${id}`),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  studentExams: () => api.get('/exams/student/my-exams'),
}

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsAPI = {
  add: (examId, data) => api.post(`/questions/${examId}`, data),
  list: (examId) => api.get(`/questions/${examId}`),
  listForStudent: (examId) => api.get(`/questions/${examId}/student`),
  update: (questionId, data) => api.put(`/questions/${questionId}`, data),
  delete: (questionId) => api.delete(`/questions/${questionId}`),
  bulkUpload: (examId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/questions/${examId}/bulk-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Students ──────────────────────────────────────────────────────────────────
export const studentsAPI = {
  create: (data) => api.post('/students/', data),
  list: () => api.get('/students/'),
  get: (id) => api.get(`/students/${id}`),
  delete: (id) => api.delete(`/students/${id}`),
  getMyProfile: () => api.get('/students/me'),
  updatePhoto: (data) => api.put('/students/me/photo', data),
  bulkUpload: (file, classId) => {
    const formData = new FormData()
    formData.append('file', file)
    if (classId) formData.append('class_id', classId)
    return api.post('/students/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  resetPassword: (id, data) => api.put(`/students/${id}/reset-password`, data),
}

// ── Classrooms ────────────────────────────────────────────────────────────────
export const classroomsAPI = {
  list: () => api.get('/classrooms/'),
  create: (data) => api.post('/classrooms/', data),
  update: (id, data) => api.put(`/classrooms/${id}`, data),
  delete: (id) => api.delete(`/classrooms/${id}`),
  getStudents: (classId) => api.get(`/classrooms/${classId}/students`),
  addStudent: (classId, studentId) => api.post(`/classrooms/${classId}/add-student/${studentId}`),
  removeStudent: (classId, studentId) => api.delete(`/classrooms/${classId}/remove-student/${studentId}`),
}

// ── Invitations ───────────────────────────────────────────────────────────────
export const invitationsAPI = {
  generateAll: (examId, classId = null) =>
    api.post(`/invitations/generate/${examId}` + (classId ? `?class_id=${classId}` : '')),
  generateSingle: (examId, studentId) =>
    api.post(`/invitations/generate/single/${examId}/${studentId}`),
  sendEmails: (examId, classId = null, pendingOnly = false) => {
    let url = `/invitations/send-email/${examId}?pending_only=${pendingOnly}`;
    if (classId) url += `&class_id=${classId}`;
    return api.post(url);
  },
  resendSingle: (invitationId) =>
    api.post(`/invitations/send-email/single/${invitationId}`),
  verifyQR: (token) => api.post('/invitations/verify-qr', { token }),
  getByExam: (examId, classId = null) =>
    api.get(`/invitations/${examId}` + (classId ? `?class_id=${classId}` : '')),
}

// ── Results ───────────────────────────────────────────────────────────────────
export const resultsAPI = {
  autosave: (data) => api.post('/results/autosave', data),
  submit: (data) => api.post('/results/submit', data),
  logActivity: (data) => api.post('/results/log-activity', data),
  myResults: () => api.get('/results/my-results'),
  examResults: (examId) => api.get(`/results/exam/${examId}`),
  activityLogs: (examId) => api.get(`/results/activity-logs/${examId}`),
  studentExamDetail: (examId) => api.get(`/results/student/${examId}/detail`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  examAnalytics: (examId) => api.get(`/analytics/exam/${examId}`),
  topStudents: (examId, limit = 10) => api.get(`/analytics/top-students/${examId}?limit=${limit}`),
  activitySummary: (examId) => api.get(`/analytics/activity-summary/${examId}`),
  allExamsPerformance: () => api.get('/analytics/all-exams-performance'),
  studentExamHistory: (studentId) => api.get(`/analytics/student/${studentId}`),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  downloadStudentPDF: (examId) =>
    api.get(`/reports/pdf/student/${examId}`, { responseType: 'blob' }),
  adminDownloadPDF: (examId, studentId) =>
    api.get(`/reports/pdf/admin/${examId}/${studentId}`, { responseType: 'blob' }),
  exportCSV: (examId) =>
    api.get(`/reports/csv/${examId}`, { responseType: 'blob' }),
}

export default api
