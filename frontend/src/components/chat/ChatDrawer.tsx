import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from '@/types'
import { sendChatMessage, getChatHistory } from '@/api/chat'
import { NeonButton } from '../common/NeonButton'

export interface ChatDrawerProps {
  findingId: string | null
  isOpen: boolean
  onClose: () => void
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  findingId,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history when findingId changes or drawer opens
  useEffect(() => {
    if (isOpen && findingId) {
      getChatHistory(findingId).then(setMessages).catch(console.error)
    }
  }, [isOpen, findingId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim() || !findingId || isLoading) return

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      finding_id: findingId,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!messageText) setInput('')
    setIsLoading(true)

    try {
      const response = await sendChatMessage(findingId, textToSend)
      setMessages((prev) => [...prev, response])
    } catch (err) {
      console.error('Chat error:', err)
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        finding_id: findingId,
        role: 'assistant',
        content: 'Error: Failed to obtain response from the AutoPatch AI reasoning engine.',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const promptSuggestions = [
    'Why did this bug happen in the code?',
    'Explain the fix simply for code review.',
    'Will this patch affect callers or performance?',
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-label="Ask AutoPatch AI"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0A0B10] border-l border-white/[0.08] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-[#0F1117]">
              <div className="flex items-center gap-2">
                <span className="text-violet-400">✨</span>
                <h3 className="font-semibold text-sm text-white font-mono uppercase tracking-wide">
                  Ask AutoPatch AI
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-text-muted hover:text-white hover:bg-white/[0.05] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="p-3 border-b border-white/[0.04] bg-black/20 flex flex-wrap gap-1.5">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading || !findingId}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-violet/10 text-violet-300 border border-violet/30 hover:bg-violet/20 transition-colors text-left cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <p>Inquire about root cause analysis, patch safety, or test failure logs.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-glass leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-cyan/10 text-cyan-200 border border-cyan/30 rounded-tr-none'
                          : 'bg-white/[0.04] text-text-primary border border-white/[0.08] rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-text-muted mt-1 px-1">
                      {msg.role === 'user' ? 'You' : 'AutoPatch Assistant'}
                    </span>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-violet-400 text-xs p-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                  <span>Synthesizing root cause reasoning...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-white/[0.06] bg-[#0F1117]">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    findingId ? 'Ask question about this finding...' : 'Select finding to chat...'
                  }
                  disabled={!findingId || isLoading}
                  className="flex-1 px-3 py-2 rounded bg-black/60 border border-white/[0.1] text-xs text-text-primary font-mono focus:outline-none focus:border-cyan disabled:opacity-50"
                />
                <NeonButton
                  type="submit"
                  variant="violet"
                  size="sm"
                  disabled={!input.trim() || !findingId || isLoading}
                >
                  Send
                </NeonButton>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
