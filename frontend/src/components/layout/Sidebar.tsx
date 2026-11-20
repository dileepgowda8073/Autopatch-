import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'
import { CodeTraceLogo } from '../common/CodeTraceLogo'

interface NavItem {
  label: string
  path: string
  icon: string
  badge?: string
}

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { sidebarOpen, setChatDrawerOpen } = useUiStore()

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Upload Project', path: '/upload', icon: '📁' },
    { label: 'Live Scan', path: '/scan', icon: '⚡' },
    { label: 'Findings', path: '/findings', icon: '🐛' },
    { label: 'Patch Review', path: '/patch', icon: '🔧' },
    { label: 'Validation', path: '/validate', icon: '🧪' },
    { label: 'Health Score', path: '/health', icon: '🛡️' },
    { label: 'Change History', path: '/history', icon: '📜' },
  ]

  return (
    <aside
      aria-label="Sidebar Navigation"
      className={`
        fixed inset-y-0 left-0 z-30
        w-64 bg-[#0A0B10]/95 backdrop-blur-2xl border-r border-white/[0.06]
        flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Brand logo & title */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
        <CodeTraceLogo size="sm" showTagline={true} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-glass text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'text-cyan bg-cyan/10 border border-cyan/30 shadow-[0_0_15px_rgba(0,245,255,0.1)]'
                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 w-1 h-5 bg-cyan rounded-r-full shadow-[0_0_8px_#00F5FF]"
                />
              )}
              <span className="text-base group-hover:scale-110 transition-transform">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom controls & AI Assistant Drawer button */}
      <div className="p-4 border-t border-white/[0.06] space-y-2">
        <button
          onClick={() => setChatDrawerOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-glass text-xs font-mono font-medium text-violet-300 bg-violet/10 border border-violet/30 hover:bg-violet/20 hover:border-violet-400 transition-all shadow-[0_0_12px_rgba(139,92,246,0.15)] cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span>✨</span>
            <span>Ask AutoPatch AI</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-violet/30 text-[10px]">ESC / ⌘K</span>
        </button>

        <div className="flex items-center justify-between text-[11px] text-text-muted px-2 pt-1 font-mono">
          <span>Sandbox: Docker</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
        </div>
      </div>
    </aside>
  )
}
