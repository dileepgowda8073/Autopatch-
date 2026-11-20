import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface NeonButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'cyan' | 'violet' | 'emerald' | 'red' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  className?: string
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...rest
}) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-glass gap-2',
    lg: 'text-base px-6 py-3 rounded-glass-lg gap-2.5 font-medium',
  }[size]

  const variantClasses = {
    cyan: `
      bg-cyan/10 text-cyan border border-cyan/40
      shadow-[0_0_15px_rgba(0,245,255,0.15)]
      hover:bg-cyan/20 hover:border-cyan hover:shadow-[0_0_25px_rgba(0,245,255,0.35)]
    `,
    violet: `
      bg-violet/10 text-violet-400 border border-violet/40
      shadow-[0_0_15px_rgba(139,92,246,0.15)]
      hover:bg-violet/20 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.35)]
    `,
    emerald: `
      bg-emerald/10 text-emerald-400 border border-emerald/40
      shadow-[0_0_15px_rgba(16,185,129,0.15)]
      hover:bg-emerald/20 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]
    `,
    red: `
      bg-red-500/10 text-red-400 border border-red-500/40
      shadow-[0_0_15px_rgba(239,68,68,0.15)]
      hover:bg-red-500/20 hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.35)]
    `,
    ghost: `
      bg-white/[0.03] text-text-primary border border-white/[0.1]
      hover:bg-white/[0.08] hover:border-white/[0.2]
    `,
  }[variant]

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.02 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-mono select-none
        transition-all duration-200 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        ${sizeClasses}
        ${variantClasses}
        ${className}
      `}
      {...rest}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}
