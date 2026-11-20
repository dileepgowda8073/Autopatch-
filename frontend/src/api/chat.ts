// ============================================================
// AutoPatch — Chat API
// Endpoints for the AI-assisted explanation chat per finding.
// ============================================================

import client, { isMockMode } from './client'
import { MOCK_CHAT_MESSAGES, MOCK_FINDINGS } from '@/mock/data'
import type { ChatMessage } from '@/types'

// ── Utility ───────────────────────────────────────────────────

function mockDelay(min = 300, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Generate a UUID-ish string without relying on `crypto.randomUUID` being
 *  available in all test environments. */
function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Contextual mock response generator ───────────────────────

/**
 * Produces a contextual assistant reply for mock mode based on the content of
 * the user's message and the finding it relates to.
 */
function buildMockReply(findingId: string, userMessage: string): string {
  const finding = MOCK_FINDINGS.find((f) => f.id === findingId)
  const findingTitle = finding?.title ?? 'this issue'
  const severity = finding?.severity ?? 'Unknown'
  const lowerMsg = userMessage.toLowerCase()

  if (lowerMsg.includes('why') || lowerMsg.includes('cause') || lowerMsg.includes('reason')) {
    return (
      `The root cause of **${findingTitle}** is: ${finding?.root_cause ?? 'not yet determined'}.\n\n` +
      `The finding was classified as **${severity}** severity because: ${finding?.severity_reason ?? 'see the finding details'}.\n\n` +
      `To reproduce it, try calling the function with \`${finding?.repro_input ?? 'the described input'}\`.`
    )
  }

  if (lowerMsg.includes('fix') || lowerMsg.includes('patch') || lowerMsg.includes('solve')) {
    return (
      `The generated patch addresses **${findingTitle}** by adding guard clauses that check for ` +
      `the problematic input before the failing operation is reached.\n\n` +
      `After the patch:\n` +
      `- **Expected behaviour**: ${finding?.expected ?? 'correct output'}\n` +
      `- **Previously**: ${finding?.actual ?? 'incorrect output'}\n\n` +
      `The fix has been validated by all four test phases (before, targeted, edge, after).`
    )
  }

  if (lowerMsg.includes('confidence') || lowerMsg.includes('certain') || lowerMsg.includes('sure')) {
    const pct = ((finding?.confidence_estimate ?? 0) * 100).toFixed(0)
    const candidateNote = finding?.is_candidate
      ? '\n\n> ⚠️ **AI estimate — not a measured probability.** This is an LLM candidate finding; ' +
        'human review is strongly recommended before accepting the patch.'
      : ''
    return (
      `The model's confidence for this finding is **${pct}%**.${candidateNote}\n\n` +
      `The detection source is **${finding?.source ?? 'unknown'}**, which uses ` +
      `${finding?.source === 'llm' ? 'large language model analysis' : 'static analysis rules'}.`
    )
  }

  if (lowerMsg.includes('severity') || lowerMsg.includes('critical') || lowerMsg.includes('risk')) {
    return (
      `**${findingTitle}** is rated **${severity}**.\n\n` +
      `Severity rationale: ${finding?.severity_reason ?? 'see finding details.'}\n\n` +
      `Description: ${finding?.description ?? ''}`
    )
  }

  // Generic fallback
  return (
    `I'm here to help you understand **${findingTitle}**.\n\n` +
    `${finding?.description ?? ''}\n\n` +
    `You can ask me about:\n` +
    `- The **root cause** of this bug\n` +
    `- How the **patch** fixes it\n` +
    `- The **confidence** and **severity** rating\n` +
    `- What happens in each **test phase**`
  )
}

// ── API functions ─────────────────────────────────────────────

/**
 * Send a user message to the AI assistant in the context of a specific finding.
 *
 * @param findingId - The finding UUID this conversation is about.
 * @param message   - The user's message text.
 * @returns The assistant's {@link ChatMessage} reply.
 */
export async function sendChatMessage(
  findingId: string,
  message: string,
): Promise<ChatMessage> {
  if (isMockMode) {
    // Simulate streaming / LLM latency.
    await mockDelay(600, 1400)

    const assistantMessage: ChatMessage = {
      id: uid(),
      finding_id: findingId,
      role: 'assistant',
      content: buildMockReply(findingId, message),
      created_at: new Date().toISOString(),
    }
    return assistantMessage
  }

  const response = await client.post<ChatMessage>(
    `/findings/${findingId}/chat`,
    { message },
  )
  return response.data
}

/**
 * Retrieve the full chat history for a finding.
 *
 * @param findingId - The finding UUID.
 * @returns An array of {@link ChatMessage} items, oldest first.
 */
export async function getChatHistory(findingId: string): Promise<ChatMessage[]> {
  if (isMockMode) {
    await mockDelay(200, 400)
    // Return messages filtered to the requested finding; fall back to the full
    // set if the finding ID doesn't match (useful in Storybook/tests).
    const messages = MOCK_CHAT_MESSAGES.filter(
      (m) => m.finding_id === findingId,
    )
    return clone(messages.length > 0 ? messages : MOCK_CHAT_MESSAGES)
  }

  const response = await client.get<ChatMessage[]>(
    `/findings/${findingId}/chat`,
  )
  return response.data
}
