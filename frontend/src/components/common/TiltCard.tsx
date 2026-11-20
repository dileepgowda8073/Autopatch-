import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { GlassCard, GlassCardProps } from './GlassCard'
import { useUiStore } from '@/store/uiStore'

export interface TiltCardProps extends GlassCardProps {
  intensity?: number
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  intensity = 5,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useUiStore((s) => s.reducedMotion)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 })
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`])
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%'])
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    x.set(mouseX / rect.width - 0.5)
    y.set(mouseY / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  if (reducedMotion) {
    return (
      <GlassCard className={className} hoverable {...rest}>
        {children}
      </GlassCard>
    )
  }

  return (
    <div style={{ perspective: 1000 }} className="relative">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="w-full h-full"
      >
        <GlassCard className={`relative overflow-hidden ${className}`} hoverable {...rest}>
          {children}
          {/* Subtle light glare layer */}
          <motion.div
            className="pointer-events-none absolute -inset-full opacity-0 hover:opacity-10 transition-opacity duration-300"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 60%)',
              left: glareX,
              top: glareY,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </GlassCard>
      </motion.div>
    </div>
  )
}
