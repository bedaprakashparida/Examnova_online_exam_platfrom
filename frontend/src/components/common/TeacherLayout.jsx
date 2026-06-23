import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  HomeIcon, ClipboardDocumentListIcon, UserGroupIcon, ChartPieIcon,
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
  AcademicCapIcon, Cog6ToothIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import LogoIcon from './LogoIcon'

const navItems = [
  { to: '/teacher', icon: HomeIcon, label: 'Dashboard', end: true },
  { to: '/teacher/exams', icon: ClipboardDocumentListIcon, label: 'Exam Management' },
  { to: '/teacher/students', icon: UserGroupIcon, label: 'Students & Classes' },
  { to: '/teacher/analytics', icon: ChartPieIcon, label: 'Analytics' },
  { to: '/teacher/settings', icon: Cog6ToothIcon, label: 'Settings' },
]

export default function TeacherLayout() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/teacher/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800 flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <LogoIcon className="w-9 h-9 flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">ExamNova</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Teacher Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 mb-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">Teacher</span>
          </div>
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
          <p className="font-semibold text-slate-900 dark:text-white">Teacher Portal</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
