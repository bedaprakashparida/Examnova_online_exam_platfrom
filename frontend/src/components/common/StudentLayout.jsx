import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  HomeIcon, ClipboardDocumentCheckIcon, SunIcon, MoonIcon,
  ArrowRightOnRectangleIcon, AcademicCapIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import LogoIcon from './LogoIcon'

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top nav */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <LogoIcon className="w-9 h-9 flex-shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">ExamNova</span>
          </div>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink
              to="/student"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <HomeIcon className="w-4 h-4" />
              My Exams
            </NavLink>
            <NavLink
              to="/student/results"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              Results
            </NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {dark ? <SunIcon className="w-5 h-5 text-amber-500" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600
                flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {user?.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
