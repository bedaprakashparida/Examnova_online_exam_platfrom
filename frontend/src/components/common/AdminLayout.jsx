import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  HomeIcon, ClipboardDocumentListIcon,
  UserGroupIcon, ChartPieIcon,
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
  ShieldCheckIcon, Cog6ToothIcon, AcademicCapIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import LogoIcon from './LogoIcon'


const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', icon: HomeIcon, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Staff',
    items: [
      { to: '/admin/staff', icon: ShieldCheckIcon, label: 'Teachers & Staff' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { to: '/admin/exams', icon: ClipboardDocumentListIcon, label: 'All Exams' },
      { to: '/admin/students', icon: UserGroupIcon, label: 'All Students' },
      { to: '/admin/analytics', icon: ChartPieIcon, label: 'Analytics' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', icon: Cog6ToothIcon, label: 'Settings' },
    ],
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/admin/login')   // ← fixed: was going to /login (student)
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800 flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <LogoIcon className="w-9 h-9 flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">ExamNova</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Admin Panel</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink key={to} to={to} end={end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + theme + logout */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <div className="px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 mb-2">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs rounded-full font-medium">
              Super Admin
            </span>
          </div>
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800
          flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Welcome, <span className="text-violet-600">{user?.name}</span>
            </span>
          </div>
          <button onClick={toggle}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {dark ? <SunIcon className="w-5 h-5 text-amber-500" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
