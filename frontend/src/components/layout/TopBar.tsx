import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUiStore } from '@/store/uiStore'
import { useProjectStore } from '@/store/projectStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { NeonButton } from '../common/NeonButton'

export const TopBar: React.FC = () => {
  const location = useLocation()
  const { toggleSidebar } = useUiStore()
  const currentProject = useProjectStore((s) => s.currentProject)
  const pipelineStatus = usePipelineStore((s) => s.status)

  // Derive human-readable breadcrumb
  const pathSegment = location.pathname.split('/')[1] || 'dashboard'
  const pageTitle = pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1)

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-14 z-20 bg-[#05060A]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 md:px-6">
      {/* Left: Mobile hamburger & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="md:hidden p-1.5 rounded-md text-text-secondary hover:text-white hover:bg-white/[0.05]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-text-muted">Home</span>
          <span className="text-text-muted">/</span>
          <span className="text-cyan font-medium">{pageTitle}</span>
        </div>
      </div>

      {/* Center: Live Pipeline FSM indicator */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
        <span className="text-text-muted">State:</span>
        <span className="text-violet-400 font-semibold">{pipelineStatus}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping ml-1" />
      </div>

      {/* Right: Active project & quick actions */}
      <div className="flex items-center gap-3">
        {currentProject && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-glass bg-white/[0.02] border border-white/[0.06] text-xs font-mono">
            <span className="text-text-muted">Project:</span>
            <span className="text-text-primary font-medium">{currentProject.name}</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan/10 text-cyan text-[10px] uppercase border border-cyan/30">
              {currentProject.language}
            </span>
          </div>
        )}

        <Link to="/upload">
          <NeonButton variant="cyan" size="sm">
            <span>+ Upload</span>
          </NeonButton>
        </Link>
      </div>
    </header>
  )
}
