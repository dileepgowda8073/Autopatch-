import React, { useState } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { LineChange } from '@/types'
import { GlassCard } from '../common/GlassCard'

export interface DiffViewerProps {
  diff: string
  explanation: string
  lineChanges: LineChange[]
  filename?: string
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  explanation,
  lineChanges,
  filename = 'src/patch.diff',
}) => {
  const [splitView, setSplitView] = useState(true)

  // Parse unified diff into oldValue / newValue approximations for react-diff-viewer if unified text provided
  // or render the structured diff viewer cleanly
  const extractOldAndNew = (rawDiff: string) => {
    const lines = rawDiff.split('\n')
    const oldLines: string[] = []
    const newLines: string[] = []

    for (const line of lines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
        continue
      }
      if (line.startsWith('-')) {
        oldLines.push(line.slice(1))
      } else if (line.startsWith('+')) {
        newLines.push(line.slice(1))
      } else {
        const content = line.startsWith(' ') ? line.slice(1) : line
        oldLines.push(content)
        newLines.push(content)
      }
    }

    return {
      oldValue: oldLines.join('\n'),
      newValue: newLines.join('\n'),
    }
  }

  const { oldValue, newValue } = extractOldAndNew(diff)

  const customStyles = {
    variables: {
      dark: {
        diffViewerBackground: '#0A0B10',
        diffViewerColor: '#F1F5F9',
        addedBackground: 'rgba(16, 185, 129, 0.12)',
        addedColor: '#34D399',
        removedBackground: 'rgba(239, 68, 68, 0.12)',
        removedColor: '#F87171',
        wordAddedBackground: 'rgba(16, 185, 129, 0.25)',
        wordRemovedBackground: 'rgba(239, 68, 68, 0.25)',
        addedGutterBackground: 'rgba(16, 185, 129, 0.08)',
        removedGutterBackground: 'rgba(239, 68, 68, 0.08)',
        gutterBackground: '#06070B',
        gutterBackgroundDark: '#05060A',
        highlightBackground: '#141520',
        highlightGutterBackground: '#1E293B',
        codeFoldGutterBackground: '#0F1117',
        codeFoldBackground: '#0A0B10',
        emptyLineBackground: '#08090E',
        gutterColor: '#475569',
        addedGutterColor: '#10B981',
        removedGutterColor: '#EF4444',
      },
    },
    line: {
      padding: '4px 8px',
      fontSize: '13px',
      fontFamily: 'JetBrains Mono, monospace',
    },
  }

  return (
    <div className="space-y-4">
      {/* Explanation card */}
      <GlassCard className="p-5" glowColor="cyan">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-cyan font-mono text-sm">✦ AI Patch Rationale:</span>
        </div>
        <p className="text-text-primary text-sm leading-relaxed mb-4">{explanation}</p>

        {/* Line changes breakdown */}
        {lineChanges.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/[0.06]">
            <span className="text-xs font-mono uppercase text-text-muted tracking-wider">
              Atomic Modifications:
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
              {lineChanges.map((change, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-1.5 rounded ${
                    change.action === 'add'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : change.action === 'remove'
                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                      : 'bg-white/[0.02] text-text-muted'
                  }`}
                >
                  <span className="w-12 text-right shrink-0 opacity-70">
                    {change.action === 'add' ? `+L${change.line}` : `-L${change.line}`}
                  </span>
                  <span className="truncate">{change.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Diff Viewer Container */}
      <div className="rounded-glass overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0A0B10]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F1117] border-b border-white/[0.06] font-mono text-xs">
          <div className="flex items-center gap-2 text-text-primary">
            <span className="text-cyan">📄</span>
            <span className="font-semibold">{filename}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted">View Mode:</span>
            <div className="inline-flex rounded-md p-0.5 bg-black/40 border border-white/[0.08]">
              <button
                onClick={() => setSplitView(true)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  splitView ? 'bg-cyan/20 text-cyan font-bold' : 'text-text-secondary hover:text-white'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setSplitView(false)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  !splitView ? 'bg-cyan/20 text-cyan font-bold' : 'text-text-secondary hover:text-white'
                }`}
              >
                Unified
              </button>
            </div>
          </div>
        </div>

        {/* Diff content */}
        <div className="overflow-x-auto text-left font-mono">
          <ReactDiffViewer
            oldValue={oldValue}
            newValue={newValue}
            splitView={splitView}
            useDarkTheme={true}
            styles={customStyles}
            compareMethod={DiffMethod.WORDS}
            leftTitle="Original Source (Target Copy)"
            rightTitle="Patched Source Proposal"
          />
        </div>
      </div>
    </div>
  )
}
