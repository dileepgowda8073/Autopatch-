import React from 'react'

interface CodeTraceLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTagline?: boolean
  showText?: boolean
  className?: string
}

export const CodeTraceLogo: React.FC<CodeTraceLogoProps> = ({
  size = 'md',
  showTagline = true,
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size]

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }[size]

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size]

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Native Vector Emblem (CT with </> code symbol inside) */}
      <div className={`relative ${iconSizes} flex-shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 160 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(0,245,255,0.35)]"
        >
          <defs>
            {/* Main Watercolor Gradient for C */}
            <linearGradient id="ctGradientC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="50%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#00F5FF" />
            </linearGradient>

            {/* Vibrant Gradient for T */}
            <linearGradient id="ctGradientT" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="60%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>

            {/* Inner code tag </> gradient */}
            <linearGradient id="ctInnerTag" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F5FF" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>

            {/* Soft Ambient Glow */}
            <filter id="ctGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── Left Bracket "C" ────────────────────────────────────── */}
          <path
            d="M 80 18 L 32 68 L 80 118 L 64 118 L 18 68 L 64 18 Z"
            fill="url(#ctGradientC)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* ── Inner Code Symbol "</>" ─────────────────────────────── */}
          {/* Left angle bracket < */}
          <path
            d="M 44 60 L 37 68 L 44 76"
            stroke="url(#ctInnerTag)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Center Slash / */}
          <path
            d="M 54 55 L 48 81"
            stroke="url(#ctInnerTag)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Right angle bracket > */}
          <path
            d="M 58 60 L 65 68 L 58 76"
            stroke="url(#ctInnerTag)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── Right Letter "T" ────────────────────────────────────── */}
          {/* Horizontal crossbar with stylized dynamic slant */}
          <path
            d="M 75 18 L 138 18 L 122 36 L 102 36 L 102 118 L 86 118 L 86 36 L 75 36 Z"
            fill="url(#ctGradientT)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-bold font-mono tracking-wider flex items-center ${textSizes}`}>
            <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Code</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan drop-shadow-[0_0_12px_rgba(0,245,255,0.4)]">
              Trace
            </span>
          </div>

          {showTagline && (
            <div className={`flex items-center gap-1.5 font-mono text-text-muted mt-1 tracking-widest uppercase ${taglineSizes}`}>
              <span className="text-cyan/60">—</span>
              <span className="text-cyan/90 font-medium">Code</span>
              <span className="text-white/30">•</span>
              <span className="text-violet-400 font-medium">Debug</span>
              <span className="text-white/30">•</span>
              <span className="text-cyan/90 font-medium">Innovate</span>
              <span className="text-cyan/60">—</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}