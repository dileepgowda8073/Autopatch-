import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'none'
  hoverable?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  hoverable = false,
  onClick,
  ...rest
}) => {
  const glowClasses = {
    cyan: 'hover:shadow-[0_0_30px_rgba(0,245,255,0.2)] hover:border-cyan/40',
    violet: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:border-violet/40',
    emerald: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:border-emerald/40',
    none: '',
  }[glowColor]

  return (
    <motion.div
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      whileHover={
        hoverable
          ? {
              scale: 1.01,
              translateY: -2,
              transition: { duration: 0.2, ease: 'easeOut' },
            }
          : undefined
      }
      className={`
        relative overflow-hidden
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08]
        rounded-glass
        shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
        transition-all duration-300
        ${hoverable ? 'cursor-pointer' : ''}
        ${glowClasses}
        ${className}
      `}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
