import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try { setUser(JSON.parse(storedUser)) }
      catch { logout() }
    }
    setLoading(false)
  }, [])

  const login = (tokenData) => {
    localStorage.setItem('token', tokenData.access_token)
    const userData = {
      id:    tokenData.user_id,
      name:  tokenData.name,
      role:  tokenData.role,   // 'admin' | 'teacher' | 'student'
      email: tokenData.email || '',
      needs_password_change: tokenData.needs_password_change || false,
    }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const isAdmin   = () => user?.role === 'admin'
  const isTeacher = () => user?.role === 'teacher'
  const isStaff   = () => user?.role === 'admin' || user?.role === 'teacher'
  const isStudent = () => user?.role === 'student'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isTeacher, isStaff, isStudent }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
