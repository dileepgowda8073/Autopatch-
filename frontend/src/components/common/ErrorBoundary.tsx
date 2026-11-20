import React, { Component, ErrorInfo, ReactNode } from 'react'
import { GlassCard } from './GlassCard'
import { NeonButton } from './NeonButton'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  public handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-6">
          <GlassCard className="p-8 max-w-xl w-full border-red-500/30 text-center space-y-4" glowColor="none">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 text-xl">
              ⚠
            </div>
            <h2 className="text-xl font-bold text-white">Application Exception Encountered</h2>
            <p className="text-text-secondary text-sm">
              An unexpected runtime error occurred within this visual component.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-base rounded-md text-xs font-mono text-red-400 text-left overflow-x-auto border border-white/[0.05]">
                {this.state.error.message}
              </pre>
            )}
            <div className="pt-2 flex justify-center">
              <NeonButton variant="cyan" onClick={this.handleReload}>
                Reload Interface
              </NeonButton>
            </div>
          </GlassCard>
        </div>
      )
    }

    return this.props.children
  }
}
