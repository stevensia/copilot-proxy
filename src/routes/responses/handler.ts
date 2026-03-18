import type { Context } from 'hono'

import type { SSEMessage } from 'hono/streaming'
import type { ChatCompletionResponse } from '~/services/copilot/create-chat-completions'
import type { ResponsesPayload, ResponsesResponse } from '~/services/copilot/create-responses'
import consola from 'consola'

import { streamSSE } from 'hono/streaming'
import { isUnsupportedApiError, recordProbeResult } from '~/lib/api-probe'
import { awaitApproval } from '~/lib/approval'
import { HTTPError } from '~/lib/error'
import { resolveBackend } from '~/lib/model-config'
import { checkRateLimit } from '~/lib/rate-limit'
import { ResponsesPayloadSchema } from '~/lib/schemas'
import { state } from '~/lib/state'
import { createCCToResponsesStreamState, translateCCResponseToResponses, translateCCStreamChunkToResponses, translateResponsesRequestToCC } from '~/lib/translation'
import { logUsage, StreamingUsageAccumulator } from '~/lib/usage-tracker'
import { validateBody } from '~/lib/validate'
import { createChatCompletions } from '~/services/copilot/create-chat-completions'
import { createResponses, summarizeResponsesPayload } from '~/services/copilot/create-responses'

export async function handleResponses(c: Context) {
  await checkRateLimit(state)

  const payload = await validateBody<ResponsesPayload>(c, ResponsesPayloadSchema)
  consola.debug('Responses API request summary:', {
    ...summarizeResponsesPayload(payload),
    contentLength: c.req.header('content-length') ?? undefined,
  })

  if (state.manualApprove) {
    await awaitApproval()
  }

  // Resolve which backend API to use
  const backend = resolveBackend(payload.model, 'responses')

  if (backend === 'chat-completions') {
    try {
      return await handleViaChatCompletions(c, payload)
    }
    catch (error) {
      if (error instanceof HTTPError && await isUnsupportedApiError(error.response)) {
        consola.info(`Model ${payload.model} does not support /chat/completions, falling back to /responses`)
        recordProbeResult(payload.model, 'chat-completions')
        return handleViaResponses(c, payload)
      }
      throw error
    }
  }

  // Try responses first; if unsupported, fall back to chat-completions
  try {
    return await handleViaResponses(c, payload)
  }
  catch (error) {
    if (error instanceof HTTPError && await isUnsupportedApiError(error.response)) {
      consola.info(`Model ${payload.model} does not support /responses, falling back to /chat/completions`)
      recordProbeResult(payload.model, 'responses')
      return handleViaChatCompletions(c, payload)
    }
    throw error
  }
}

/** Direct path: model supports responses API */
async function handleViaResponses(c: Context, payload: ResponsesPayload) {
  const startTime = Date.now()
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip')
  const userAgent = c.req.header('user-agent')

  const response = await createResponses(payload)

  if (isResponsesNonStreaming(response)) {
    if (consola.level >= 4) {
      consola.debug('Non-streaming responses:', JSON.stringify(response))
    }
    // Log usage
    if (response.usage) {
      logUsage({
        model: payload.model,
        prompt_tokens: response.usage.input_tokens || 0,
        completion_tokens: response.usage.output_tokens || 0,
        total_tokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
        endpoint: '/responses',
        duration_ms: Date.now() - startTime,
        client_ip: clientIp,
        user_agent: userAgent,
      })
    }
    return c.json(response)
  }

  consola.debug('Streaming responses')
  return streamSSE(c, async (stream) => {
    const usageAccumulator = new StreamingUsageAccumulator(
      payload.model, startTime, '/responses', clientIp, userAgent
    )

    for await (const chunk of response) {
      if (consola.level >= 4) {
        consola.debug('Responses streaming chunk:', JSON.stringify(chunk))
      }
      // Track usage from streaming
      if (chunk.data && chunk.data !== '[DONE]') {
        try {
          const parsed = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data
          usageAccumulator.updateFromResponsesEvent(parsed)
        } catch {}
      }
      await stream.writeSSE(chunk as SSEMessage)
    }

    usageAccumulator.finalize()
  })
}

/** Translation path: model only supports chat-completions, translate Responses ↔ CC */
async function handleViaChatCompletions(c: Context, payload: ResponsesPayload) {
  const startTime = Date.now()
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip')
  const userAgent = c.req.header('user-agent')

  const ccPayload = translateResponsesRequestToCC(payload)
  if (consola.level >= 4) {
    consola.debug('Translated Responses→CC payload:', JSON.stringify(ccPayload).slice(-400))
  }

  const response = await createChatCompletions(ccPayload)

  if (isCCNonStreaming(response)) {
    if (consola.level >= 4) {
      consola.debug('Non-streaming CC response (translated):', JSON.stringify(response))
    }
    // Log usage
    if (response.usage) {
      logUsage({
        model: payload.model,
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        endpoint: '/responses (via cc)',
        duration_ms: Date.now() - startTime,
        client_ip: clientIp,
        user_agent: userAgent,
      })
    }
    const responsesResponse = translateCCResponseToResponses(response)
    return c.json(responsesResponse)
  }

  // Streaming translation (CC chunks → Responses stream events)
  consola.debug('Streaming CC response (translated to Responses events)')
  return streamSSE(c, async (stream) => {
    const streamState = createCCToResponsesStreamState()
    const usageAccumulator = new StreamingUsageAccumulator(
      payload.model, startTime, '/responses (via cc)', clientIp, userAgent
    )

    for await (const rawEvent of response) {
      if (rawEvent.data === '[DONE]')
        break
      if (!rawEvent.data)
        continue

      let chunk
      try {
        chunk = JSON.parse(rawEvent.data)
      }
      catch {
        consola.error('Failed to parse CC stream chunk:', rawEvent.data)
        continue
      }

      // Track usage
      usageAccumulator.updateFromCCChunk(chunk)

      const responsesEvents = translateCCStreamChunkToResponses(chunk, streamState)
      for (const evt of responsesEvents) {
        await stream.writeSSE({
          event: evt.type,
          data: JSON.stringify(evt),
        })
      }
    }

    usageAccumulator.finalize()
  })
}

function isResponsesNonStreaming(response: Awaited<ReturnType<typeof createResponses>>): response is ResponsesResponse {
  return Object.hasOwn(response, 'output')
}

function isCCNonStreaming(response: Awaited<ReturnType<typeof createChatCompletions>>): response is ChatCompletionResponse {
  return Object.hasOwn(response, 'choices')
}
