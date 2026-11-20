import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Fonts ──────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },

      // ── Design-token colours ───────────────────────────────────────────
      colors: {
        // Base surfaces
        base:    '#05060A',
        surface: '#0A0B10',
        elevated:'#0F1117',
        overlay: '#141520',

        // Neon accents
        cyan:    { DEFAULT: '#00F5FF', 500: '#00F5FF', 400: '#33F7FF', 600: '#00C2CC', glow: 'rgba(0,245,255,0.15)' },
        violet:  { DEFAULT: '#8B5CF6', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', glow: 'rgba(139,92,246,0.15)' },
        emerald: { DEFAULT: '#10B981', 400: '#34D399', 500: '#10B981', 600: '#059669', glow: 'rgba(16,185,129,0.15)' },

        // Status semantics
        verified:     { DEFAULT: '#10B981', glow: 'rgba(16,185,129,0.20)' },
        failed:       { DEFAULT: '#EF4444', glow: 'rgba(239,68,68,0.20)' },
        'not-verified': { DEFAULT: '#F59E0B', glow: 'rgba(245,158,11,0.20)' },
        'needs-review': { DEFAULT: '#8B5CF6', glow: 'rgba(139,92,246,0.20)' },

        // Severity
        critical: '#EF4444',
        high:     '#F97316',
        medium:   '#F59E0B',
        low:      '#06B6D4',

        // Text hierarchy
        'text-primary':   '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted':     '#475569',

        // Glass borders
        'border-glass': 'rgba(255,255,255,0.08)',
        'border-glow':  'rgba(0,245,255,0.30)',
      },

      // ── Background patterns ────────────────────────────────────────────
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
        `,
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        'cyan-glow-radial': 'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, transparent 70%)',
        'violet-glow-radial': 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,245,255,0.12), transparent)',
        'sidebar-gradient': 'linear-gradient(180deg, #0A0B10 0%, #05060A 100%)',
        'neon-border': 'linear-gradient(135deg, rgba(0,245,255,0.5), rgba(139,92,246,0.5))',
      },

      backgroundSize: {
        'grid': '32px 32px',
      },

      // ── Spacing extras ─────────────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
        'sidebar': '16rem',
      },

      // ── Box shadows (glow effects) ──────────────────────────────────────
      boxShadow: {
        'glass':          '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-hover':    '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        'cyan-glow':      '0 0 20px rgba(0,245,255,0.3), 0 0 60px rgba(0,245,255,0.1)',
        'cyan-glow-sm':   '0 0 10px rgba(0,245,255,0.4)',
        'violet-glow':    '0 0 20px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1)',
        'violet-glow-sm': '0 0 10px rgba(139,92,246,0.4)',
        'emerald-glow':   '0 0 20px rgba(16,185,129,0.3)',
        'red-glow':       '0 0 20px rgba(239,68,68,0.3)',
        'amber-glow':     '0 0 20px rgba(245,158,11,0.3)',
        'neon-border':    '0 0 0 1px rgba(0,245,255,0.3), 0 0 20px rgba(0,245,255,0.1)',
        'card':           '0 4px 24px rgba(0,0,0,0.6)',
        'card-hover':     '0 8px 40px rgba(0,0,0,0.7)',
      },

      // ── Blur ──────────────────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
        sm: '8px',
        md: '12px',
        lg: '20px',
        xl: '32px',
      },

      // ── Border radius ─────────────────────────────────────────────────
      borderRadius: {
        'glass': '12px',
        'glass-lg': '16px',
        'glass-xl': '20px',
      },

      // ── Animations ────────────────────────────────────────────────────
      animation: {
        'spin-slow':     'spin 8s linear infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'float':         'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'gradient-x':    'gradientX 4s ease infinite',
        'border-flow':   'borderFlow 3s linear infinite',
        'fade-in':       'fadeIn 0.4s ease forwards',
        'slide-up':      'slideUp 0.4s ease forwards',
        'slide-in-left': 'slideInLeft 0.3s ease forwards',
        'shimmer':       'shimmer 1.5s ease-in-out infinite',
        'scan-line':     'scanLine 2s linear infinite',
        'orb-travel':    'orbTravel 3s ease-in-out infinite',
      },

      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        borderFlow: {
          '0%':   { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        orbTravel: {
          '0%':   { offsetDistance: '0%' },
          '100%': { offsetDistance: '100%' },
        },
      },

      // ── Transitions ────────────────────────────────────────────────────
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
