import React from 'react'
import { ValidationStatus, VALIDATION_COLORS, VALIDATION_LABELS } from '@/types'

export interface StatusBadgeProps {
  status: ValidationStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-medium',
  }[size]

  const statusConfig = {
    verified: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      dot: 'bg-emerald-400',
      icon: '✓',
      title: 'Verified: All assertion tests and validation criteria passed cleanly.',
    },
    failed: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
      dot: 'bg-red-400',
      icon: '✗',
      title: 'Failed: At least one automated regression or boundary test failed.',
    },
    not_verified: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      dot: 'bg-amber-400',
      icon: '⚠',
      title: 'Not Verified: No tests collected (exit 5), timeout, or environment error.',
    },
  }[status]

  return (
    <span
      title={statusConfig.title}
      className={`
        inline-flex items-center rounded-full border
        font-mono uppercase tracking-wider
        ${statusConfig.bg}
        ${statusConfig.border}
        ${statusConfig.text}
        ${statusConfig.glow}
        ${sizeClasses}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
      {showIcon && <span>{statusConfig.icon}</span>}
      <span>{VALIDATION_LABELS[status]}</span>
    </span>
  )
}
