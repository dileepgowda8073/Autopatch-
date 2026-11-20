import React from 'react'
import { motion } from 'framer-motion'
import { Severity, SEVERITY_COLORS } from '@/types'

export interface SeverityBadgeProps {
  severity: Severity
  showIcon?: boolean
  className?: string
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
  className = '',
}) => {
  const config = {
    Critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]',
      icon: '●',
    },
    High: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]',
      icon: '●',
    },
    Medium: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      icon: '●',
    },
    Low: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]',
      icon: '●',
    },
  }[severity]

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border
        text-xs font-mono font-medium tracking-wide
        ${config.bg}
        ${config.border}
        ${config.text}
        ${config.glow}
        ${className}
      `}
    >
      {showIcon && <span className="text-[9px]">{config.icon}</span>}
      <span>{severity}</span>
    </motion.span>
  )
}
