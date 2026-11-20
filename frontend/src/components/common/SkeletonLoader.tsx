import React from 'react'
import { GlassCard } from './GlassCard'

export interface SkeletonLoaderProps {
  variant?: 'card' | 'line' | 'finding' | 'tree'
  lines?: number
  className?: string
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  lines = 3,
  className = '',
}) => {
  const shimmerBase = `
    relative overflow-hidden
    bg-white/[0.03]
    before:absolute before:inset-0
    before:-translate-x-full
    before:animate-[shimmer_1.5s_infinite]
    before:bg-gradient-to-r
    before:from-transparent before:via-white/[0.08] before:to-transparent
  `

  if (variant === 'card') {
    return (
      <GlassCard className={`p-6 space-y-4 ${className}`}>
        <div className={`h-6 w-1/3 rounded ${shimmerBase}`} />
        <div className={`h-4 w-full rounded ${shimmerBase}`} />
        <div className={`h-4 w-5/6 rounded ${shimmerBase}`} />
        <div className={`h-10 w-28 rounded-md mt-4 ${shimmerBase}`} />
      </GlassCard>
    )
  }

  if (variant === 'finding') {
    return (
      <GlassCard className={`p-5 space-y-3.5 border-white/[0.05] ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`h-5 w-20 rounded-full ${shimmerBase}`} />
          <div className={`h-5 w-16 rounded-full ${shimmerBase}`} />
          <div className={`h-4 w-32 rounded ml-auto ${shimmerBase}`} />
        </div>
        <div className={`h-5 w-3/4 rounded ${shimmerBase}`} />
        <div className={`h-4 w-full rounded ${shimmerBase}`} />
        <div className={`h-3 w-1/2 rounded ${shimmerBase}`} />
      </GlassCard>
    )
  }

  if (variant === 'tree') {
    return (
      <div className={`space-y-2.5 p-4 ${className}`}>
        <div className={`h-4 w-28 rounded ${shimmerBase}`} />
        <div className={`h-4 w-40 rounded ml-4 ${shimmerBase}`} />
        <div className={`h-4 w-36 rounded ml-8 ${shimmerBase}`} />
        <div className={`h-4 w-48 rounded ml-8 ${shimmerBase}`} />
        <div className={`h-4 w-32 rounded ml-4 ${shimmerBase}`} />
      </div>
    )
  }

  // 'line' variant
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded ${shimmerBase}`}
          style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
        />
      ))}
    </div>
  )
}
