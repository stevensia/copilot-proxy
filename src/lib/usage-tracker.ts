/**
 * Usage tracking integration
 * Hooks into request handlers to log API usage
 */

import type { ChatCompletionResponse } from '~/services/copilot/create-chat-completions'
import type { ResponsesResponse } from '~/services/copilot/create-responses'
import { logUsage } from './usage-db'

/**
 * Log usage from chat completion response
 */
export function logChatCompletionUsage(
  model: string,
  response: ChatCompletionResponse,
  startTime: number,
  endpoint: string = '/chat/completions',
  clientIp?: string,
  userAgent?: string
): void {
  const usage = response.usage
  if (!usage) return

  logUsage({
    model,
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    endpoint,
    duration_ms: Date.now() - startTime,
    client_ip: clientIp,
    user_agent: userAgent,
  })
}

/**
 * Log usage from responses API
 */
export function logResponsesUsage(
  model: string,
  response: ResponsesResponse,
  startTime: number,
  endpoint: string = '/responses',
  clientIp?: string,
  userAgent?: string
): void {
  const usage = response.usage
  if (!usage) return

  logUsage({
    model,
    prompt_tokens: usage.input_tokens || 0,
    completion_tokens: usage.output_tokens || 0,
    total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    endpoint,
    duration_ms: Date.now() - startTime,
    client_ip: clientIp,
    user_agent: userAgent,
  })
}

/**
 * Accumulator for streaming responses
 */
export class StreamingUsageAccumulator {
  private model: string
  private startTime: number
  private endpoint: string
  private clientIp?: string
  private userAgent?: string
  
  private promptTokens = 0
  private completionTokens = 0
  private totalTokens = 0
  private hasUsage = false

  constructor(
    model: string,
    startTime: number,
    endpoint: string,
    clientIp?: string,
    userAgent?: string
  ) {
    this.model = model
    this.startTime = startTime
    this.endpoint = endpoint
    this.clientIp = clientIp
    this.userAgent = userAgent
  }

  /**
   * Update from streaming chunk (chat completions format)
   */
  updateFromCCChunk(chunk: any): void {
    if (chunk.usage) {
      this.promptTokens = chunk.usage.prompt_tokens || this.promptTokens
      this.completionTokens = chunk.usage.completion_tokens || this.completionTokens
      this.totalTokens = chunk.usage.total_tokens || this.totalTokens
      this.hasUsage = true
    }
  }

  /**
   * Update from streaming event (responses format)
   */
  updateFromResponsesEvent(event: any): void {
    if (event.response?.usage) {
      this.promptTokens = event.response.usage.input_tokens || this.promptTokens
      this.completionTokens = event.response.usage.output_tokens || this.completionTokens
      this.totalTokens = (event.response.usage.input_tokens || 0) + (event.response.usage.output_tokens || 0)
      this.hasUsage = true
    }
  }

  /**
   * Finalize and log usage
   */
  finalize(): void {
    if (!this.hasUsage) return

    logUsage({
      model: this.model,
      prompt_tokens: this.promptTokens,
      completion_tokens: this.completionTokens,
      total_tokens: this.totalTokens,
      endpoint: this.endpoint,
      duration_ms: Date.now() - this.startTime,
      client_ip: this.clientIp,
      user_agent: this.userAgent,
    })
  }
}
