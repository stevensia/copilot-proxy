/**
 * Usage tracking database module
 * Cross-platform SQLite storage for API usage logs
 */

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

const APP_DIR = join(homedir(), '.copilot-proxy')
const DB_PATH = join(APP_DIR, 'usage.db')
const PRICING_PATH = join(APP_DIR, 'pricing.json')

/**
 * Model pricing (USD per 1M tokens)
 * Sources:
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 * - Azure OpenAI: https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/
 *
 * Note: These are estimated equivalent prices. Copilot subscription includes
 * API access but actual costs depend on your subscription tier.
 */
const DEFAULT_PRICING: Record<string, { input: number, output: number }> = {
  // GPT-4o series (Azure/OpenAI pricing)
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },

  // GPT-4.1 series
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'gpt-4.1-2025-04-14': { input: 2.00, output: 8.00 },

  // GPT-5 series (estimated based on capability tiers)
  'gpt-5': { input: 5.00, output: 20.00 },
  'gpt-5.1': { input: 5.00, output: 20.00 },
  'gpt-5.2': { input: 5.00, output: 20.00 },
  'gpt-5-mini': { input: 0.80, output: 3.20 },
  'gpt-5-nano': { input: 0.15, output: 0.60 },
  'gpt-5.1-codex': { input: 5.00, output: 20.00 },
  'gpt-5.1-codex-mini': { input: 0.80, output: 3.20 },
  'gpt-5.1-codex-max': { input: 10.00, output: 40.00 },
  'gpt-5.2-codex': { input: 5.00, output: 20.00 },
  'gpt-5.3-codex': { input: 5.00, output: 20.00 },
  'gpt-5.4': { input: 5.00, output: 20.00 },
  'gpt-5.4-mini': { input: 0.80, output: 3.20 },

  // Reasoning models
  'o3-mini': { input: 1.10, output: 4.40 },
  'o4-mini': { input: 1.10, output: 4.40 },

  // Claude models (Anthropic pricing)
  'claude-haiku-4.5': { input: 0.80, output: 4.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-sonnet-4.5': { input: 3.00, output: 15.00 },
  'claude-sonnet-4.6': { input: 3.00, output: 15.00 },
  'claude-opus-4.5': { input: 15.00, output: 75.00 },
  'claude-opus-4.6': { input: 15.00, output: 75.00 },
  'claude-opus-4.6-1m': { input: 15.00, output: 75.00 },

  // Gemini models (Google pricing)
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'gemini-3-pro-preview': { input: 1.25, output: 5.00 },
  'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 5.00 },

  // Legacy models
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4-0613': { input: 30.00, output: 60.00 },
  'gpt-4-0125-preview': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-0613': { input: 0.50, output: 1.50 },
}

// Runtime pricing cache
let pricingCache: Record<string, { input: number, output: number }> | null = null

/**
 * Load pricing from file or use defaults
 */
export function loadPricing(): Record<string, { input: number, output: number }> {
  if (pricingCache)
    return pricingCache

  try {
    if (existsSync(PRICING_PATH)) {
      const custom = JSON.parse(readFileSync(PRICING_PATH, 'utf-8'))
      pricingCache = { ...DEFAULT_PRICING, ...custom }
    }
    else {
      pricingCache = DEFAULT_PRICING
    }
  }
  catch {
    pricingCache = DEFAULT_PRICING
  }

  return pricingCache!
}

/**
 * Save custom pricing to file
 */
export function savePricing(pricing: Record<string, { input: number, output: number }>): void {
  if (!existsSync(APP_DIR)) {
    mkdirSync(APP_DIR, { recursive: true })
  }
  writeFileSync(PRICING_PATH, JSON.stringify(pricing, null, 2))
  pricingCache = { ...DEFAULT_PRICING, ...pricing }
}

/**
 * Get pricing for a model
 */
export function getModelPricing(model: string): { input: number, output: number } {
  const pricing = loadPricing()

  // Exact match
  if (pricing[model])
    return pricing[model]

  // Fuzzy match: try to find a base model
  for (const [key, value] of Object.entries(pricing)) {
    if (model.startsWith(key) || key.startsWith(model)) {
      return value
    }
  }

  // Default fallback (mid-range pricing)
  return { input: 2.00, output: 8.00 }
}

/**
 * Calculate cost for a usage record
 */
export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = getModelPricing(model)
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000
}

/**
 * Get all pricing data (for UI display)
 */
export function getAllPricing(): Record<string, { input: number, output: number }> {
  return loadPricing()
}

let db: Database | null = null

/**
 * Initialize database connection and schema
 */
export function getUsageDb(): Database {
  if (db)
    return db

  // Ensure directory exists
  if (!existsSync(APP_DIR)) {
    mkdirSync(APP_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.exec('PRAGMA journal_mode=WAL')

  // Create tables
  db.exec(`
    -- Usage log table
    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now', 'localtime')),
      model TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      endpoint TEXT,
      duration_ms INTEGER,
      client_ip TEXT,
      user_agent TEXT,
      hostname TEXT
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_log(model);
    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(date(timestamp));
    CREATE INDEX IF NOT EXISTS idx_usage_hostname ON usage_log(hostname);

    -- Auth config table
    CREATE TABLE IF NOT EXISTS auth_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Login attempts for rate limiting
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now', 'localtime')),
      success INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_ip_ts ON login_attempts(ip, timestamp);
  `)

  return db
}

/**
 * Log API usage
 */
export interface UsageLogEntry {
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  endpoint?: string
  duration_ms?: number
  client_ip?: string
  user_agent?: string
  hostname?: string
}

// Local hostname for tagging local entries
const LOCAL_HOSTNAME = hostname()

export function logUsage(entry: UsageLogEntry): void {
  try {
    const db = getUsageDb()
    db.prepare(`
      INSERT INTO usage_log (timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms, client_ip, user_agent, hostname)
      VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.model,
      entry.prompt_tokens,
      entry.completion_tokens,
      entry.total_tokens,
      entry.endpoint ?? null,
      entry.duration_ms ?? null,
      entry.client_ip ?? null,
      entry.user_agent ?? null,
      entry.hostname ?? LOCAL_HOSTNAME,
    )
  }
  catch (e) {
    // Silent fail - don't break main flow
    console.error('[UsageDB] Failed to log usage:', e)
  }
}

/**
 * Get usage statistics
 */
export interface UsageStats {
  total_calls: number
  total_tokens: number
  total_prompt_tokens: number
  total_completion_tokens: number
}

export function getStats(since?: string): UsageStats {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  // For /v1/messages endpoint (Claude sessions), prompt_tokens is cumulative.
  // Calculate incremental prompt tokens using window function.
  // For other endpoints, use raw values.
  const result = db.prepare(`
    WITH incremental AS (
      SELECT
        endpoint,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        CASE
          WHEN endpoint = '/v1/messages' THEN
            prompt_tokens - COALESCE(LAG(prompt_tokens) OVER (
              PARTITION BY endpoint, user_agent
              ORDER BY timestamp, id
            ), 0)
          ELSE prompt_tokens
        END as prompt_delta
      FROM usage_log
      ${whereClause}
    )
    SELECT
      COUNT(*) as total_calls,
      COALESCE(SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END + completion_tokens), 0) as total_tokens,
      COALESCE(SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END), 0) as total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as total_completion_tokens
    FROM incremental
  `).get(...params) as UsageStats

  return result
}

/**
 * Get hourly usage
 */
export interface HourlyUsage {
  hour: string
  calls: number
  tokens: number
  prompt_tokens: number
  completion_tokens: number
}

export function getHourlyUsage(since?: string): HourlyUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  // Same incremental logic as getStats() for Claude /v1/messages endpoint
  return db.prepare(`
    WITH incremental AS (
      SELECT
        timestamp,
        endpoint,
        user_agent,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        CASE
          WHEN endpoint = '/v1/messages' THEN
            prompt_tokens - COALESCE(LAG(prompt_tokens) OVER (
              PARTITION BY endpoint, user_agent
              ORDER BY timestamp, id
            ), 0)
          ELSE prompt_tokens
        END as prompt_delta
      FROM usage_log
      ${whereClause}
    )
    SELECT
      strftime('%Y-%m-%d %H:00', timestamp) as hour,
      COUNT(*) as calls,
      SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END + completion_tokens) as tokens,
      SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END) as prompt_tokens,
      SUM(completion_tokens) as completion_tokens
    FROM incremental
    GROUP BY hour
    ORDER BY hour ASC
  `).all(...params) as HourlyUsage[]
}

/**
 * Get daily usage
 */
export interface DailyUsage {
  date: string
  calls: number
  tokens: number
  prompt_tokens: number
  completion_tokens: number
}

export function getDailyUsage(since?: string): DailyUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  return db.prepare(`
    SELECT
      date(timestamp) as date,
      COUNT(*) as calls,
      SUM(total_tokens) as tokens,
      SUM(prompt_tokens) as prompt_tokens,
      SUM(completion_tokens) as completion_tokens
    FROM usage_log
    ${whereClause}
    GROUP BY date
    ORDER BY date DESC
  `).all(...params) as DailyUsage[]
}

/**
 * Get usage by model with cost calculation
 */
export interface ModelUsage {
  model: string
  calls: number
  tokens: number
  prompt_tokens: number
  completion_tokens: number
  cost: number
}

export function getModelUsage(since?: string): ModelUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  // Calculate incremental prompt tokens for /v1/messages endpoint
  const rows = db.prepare(`
    WITH incremental AS (
      SELECT 
        model,
        endpoint,
        user_agent,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        CASE 
          WHEN endpoint = '/v1/messages' THEN
            prompt_tokens - COALESCE(LAG(prompt_tokens) OVER (
              PARTITION BY endpoint, user_agent 
              ORDER BY timestamp, id
            ), 0)
          ELSE prompt_tokens
        END as prompt_delta
      FROM usage_log
      ${whereClause}
    )
    SELECT 
      model,
      COUNT(*) as calls,
      SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END + completion_tokens) as tokens,
      SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END) as prompt_tokens,
      SUM(completion_tokens) as completion_tokens
    FROM incremental
    GROUP BY model
    ORDER BY tokens DESC
  `).all(...params) as Omit<ModelUsage, 'cost'>[]

  // Add cost calculation
  return rows.map(r => ({
    ...r,
    cost: calculateCost(r.model, r.prompt_tokens, r.completion_tokens),
  }))
}

/**
 * Get usage by source (user agent)
 */
export interface SourceUsage {
  source: string
  calls: number
  tokens: number
  prompt_tokens: number
  completion_tokens: number
  cost: number
}

export function getSourceUsage(since?: string): SourceUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  // Calculate incremental prompt tokens (same logic as getModelUsage)
  const rows = db.prepare(`
    WITH incremental AS (
      SELECT
        model,
        endpoint,
        user_agent,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        CASE
          WHEN endpoint = '/v1/messages' THEN
            prompt_tokens - COALESCE(LAG(prompt_tokens) OVER (
              PARTITION BY endpoint, user_agent
              ORDER BY timestamp, id
            ), 0)
          ELSE prompt_tokens
        END as prompt_delta
      FROM usage_log
      ${whereClause}
    )
    SELECT
      model,
      user_agent,
      COUNT(*) as calls,
      SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END + completion_tokens) as tokens,
      SUM(CASE WHEN prompt_delta > 0 THEN prompt_delta ELSE prompt_tokens END) as prompt_tokens,
      SUM(completion_tokens) as completion_tokens
    FROM incremental
    GROUP BY model, user_agent
    ORDER BY tokens DESC
  `).all(...params) as { model: string, user_agent: string | null, calls: number, tokens: number, prompt_tokens: number, completion_tokens: number }[]

  // Aggregate by source, calculating cost per model first
  const sourceMap = new Map<string, SourceUsage>()
  for (const r of rows) {
    const source = parseSource(r.user_agent) || 'Unknown'
    const cost = calculateCost(r.model, r.prompt_tokens, r.completion_tokens)
    const existing = sourceMap.get(source)
    if (existing) {
      existing.calls += r.calls
      existing.tokens += r.tokens
      existing.prompt_tokens += r.prompt_tokens
      existing.completion_tokens += r.completion_tokens
      existing.cost += cost
    }
    else {
      sourceMap.set(source, {
        source,
        calls: r.calls,
        tokens: r.tokens,
        prompt_tokens: r.prompt_tokens,
        completion_tokens: r.completion_tokens,
        cost,
      })
    }
  }

  return Array.from(sourceMap.values()).sort((a, b) => b.tokens - a.tokens)
}

/**
 * Get recent usage records with cost
 */
export interface RecentUsage {
  id: number
  timestamp: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  endpoint: string | null
  duration_ms: number | null
  source: string | null
  cost: number
}

function parseSource(userAgent: string | null): string | null {
  if (!userAgent)
    return null
  if (userAgent.includes('claude-cli'))
    return 'Claude Code'
  if (userAgent.includes('OpenAI/JS'))
    return 'OpenClaw'
  if (userAgent.includes('curl'))
    return 'curl'
  return userAgent.split('/')[0] || userAgent
}

export function getRecentUsage(limit: number = 50, offset: number = 0): RecentUsage[] {
  const db = getUsageDb()
  const rows = db.prepare(`
    SELECT id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms, user_agent
    FROM usage_log
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as (Omit<RecentUsage, 'source' | 'cost'> & { user_agent: string | null })[]

  return rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    model: r.model,
    prompt_tokens: r.prompt_tokens,
    completion_tokens: r.completion_tokens,
    total_tokens: r.total_tokens,
    endpoint: r.endpoint,
    duration_ms: r.duration_ms,
    source: parseSource(r.user_agent),
    cost: calculateCost(r.model, r.prompt_tokens, r.completion_tokens),
  }))
}

/**
 * Get today's stats with cost
 */
export interface TodayStats extends UsageStats {
  cost: number
}

export function getTodayStats(): TodayStats {
  const db = getUsageDb()
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      COALESCE(SUM(total_tokens), 0) as total_tokens,
      COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as total_completion_tokens
    FROM usage_log
    WHERE date(timestamp) = date('now', 'localtime')
  `).get() as UsageStats

  // Calculate cost by model
  const modelStats = db.prepare(`
    SELECT model, SUM(prompt_tokens) as prompt, SUM(completion_tokens) as completion
    FROM usage_log
    WHERE date(timestamp) = date('now', 'localtime')
    GROUP BY model
  `).all() as { model: string, prompt: number, completion: number }[]

  const cost = modelStats.reduce((sum, m) => sum + calculateCost(m.model, m.prompt, m.completion), 0)

  return { ...stats, cost }
}

/**
 * Get total cost for a period
 */
export function getTotalCost(since?: string): number {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  const modelStats = db.prepare(`
    SELECT model, SUM(prompt_tokens) as prompt, SUM(completion_tokens) as completion
    FROM usage_log
    ${whereClause}
    GROUP BY model
  `).all(...params) as { model: string, prompt: number, completion: number }[]

  return modelStats.reduce((sum, m) => sum + calculateCost(m.model, m.prompt, m.completion), 0)
}

/**
 * Export to CSV
 */
export function exportToCsv(since?: string): string {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  const rows = db.prepare(`
    SELECT timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms
    FROM usage_log
    ${whereClause}
    ORDER BY timestamp DESC
  `).all(...params) as any[]

  const header = 'timestamp,model,prompt_tokens,completion_tokens,total_tokens,endpoint,duration_ms'
  const lines = rows.map(r =>
    `${r.timestamp},${r.model},${r.prompt_tokens},${r.completion_tokens},${r.total_tokens},${r.endpoint || ''},${r.duration_ms || ''}`,
  )

  return [header, ...lines].join('\n')
}

/**
 * Get yesterday's cost (same time window as today so far)
 * e.g., if it's 3pm today, get yesterday's cost from midnight to 3pm
 */
export function getYesterdayCost(): number {
  const db = getUsageDb()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const elapsedMs = now.getTime() - todayStart.getTime()

  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayEnd = new Date(yesterdayStart.getTime() + elapsedMs)

  const sinceStr = yesterdayStart.toISOString().replace('T', ' ').slice(0, 19)
  const untilStr = yesterdayEnd.toISOString().replace('T', ' ').slice(0, 19)

  const modelStats = db.prepare(`
    SELECT model, SUM(prompt_tokens) as prompt, SUM(completion_tokens) as completion
    FROM usage_log
    WHERE timestamp >= ? AND timestamp <= ?
    GROUP BY model
  `).all(sinceStr, untilStr) as { model: string, prompt: number, completion: number }[]

  return modelStats.reduce((sum, m) => sum + calculateCost(m.model, m.prompt, m.completion), 0)
}

/**
 * Get activity metrics for the activity page
 */
export interface ActivityMetrics {
  totalCalls: number
  totalCost: number
  avgDurationMs: number | null
  topModel: string | null
  peakHour: string | null
}

export function getActivityMetrics(since?: string): ActivityMetrics {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  // Basic counts
  const basic = db.prepare(`
    SELECT
      COUNT(*) as totalCalls,
      AVG(duration_ms) as avgDurationMs
    FROM usage_log
    ${whereClause}
  `).get(...params) as { totalCalls: number, avgDurationMs: number | null }

  // Total cost
  const totalCost = getTotalCost(since)

  // Top model by call count
  const topModelRow = db.prepare(`
    SELECT model, COUNT(*) as cnt
    FROM usage_log
    ${whereClause}
    GROUP BY model
    ORDER BY cnt DESC
    LIMIT 1
  `).get(...params) as { model: string, cnt: number } | undefined

  // Peak hour
  const peakHourRow = db.prepare(`
    SELECT strftime('%H:00', timestamp) as hr, COUNT(*) as cnt
    FROM usage_log
    ${whereClause}
    GROUP BY hr
    ORDER BY cnt DESC
    LIMIT 1
  `).get(...params) as { hr: string, cnt: number } | undefined

  return {
    totalCalls: basic.totalCalls,
    totalCost,
    avgDurationMs: basic.avgDurationMs ? Math.round(basic.avgDurationMs) : null,
    topModel: topModelRow?.model ?? null,
    peakHour: peakHourRow?.hr ?? null,
  }
}

/**
 * Close database connection
 */
export function closeUsageDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Get all known hostnames
 */
export function getHostnames(): string[] {
  const db = getUsageDb()
  const rows = db.prepare(`
    SELECT DISTINCT hostname FROM usage_log WHERE hostname IS NOT NULL ORDER BY hostname
  `).all() as { hostname: string }[]
  return rows.map(r => r.hostname)
}

/**
 * Batch ingest usage records from remote machines
 */
export interface RemoteUsageEntry {
  timestamp: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  endpoint?: string
  duration_ms?: number
  user_agent?: string
  hostname: string
}

export function ingestRemoteUsage(entries: RemoteUsageEntry[]): number {
  const db = getUsageDb()
  const stmt = db.prepare(`
    INSERT INTO usage_log (timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms, client_ip, user_agent, hostname)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  const tx = db.transaction(() => {
    for (const e of entries) {
      stmt.run(
        e.timestamp,
        e.model,
        e.prompt_tokens,
        e.completion_tokens,
        e.total_tokens,
        e.endpoint ?? null,
        e.duration_ms ?? null,
        null,
        e.user_agent ?? null,
        e.hostname,
      )
      count++
    }
  })
  tx()
  return count
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  sync_enabled: boolean
  sync_remote_url: string
  sync_ingest_key: string
  sync_interval_minutes: number
  sync_last_id: number
  sync_last_time: string
  sync_last_error: string
  sync_last_count: number
  ingest_key: string
}

function getAuthConfigValue(key: string): string | null {
  const db = getUsageDb()
  const row = db.prepare(`SELECT value FROM auth_config WHERE key = ?`).get(key) as { value: string } | undefined
  return row?.value ?? null
}

function setAuthConfigValue(key: string, value: string): void {
  const db = getUsageDb()
  db.prepare(`INSERT OR REPLACE INTO auth_config (key, value) VALUES (?, ?)`).run(key, value)
}

/**
 * Get sync configuration from auth_config table
 */
export function getSyncConfig(): SyncConfig {
  return {
    sync_enabled: getAuthConfigValue('sync_enabled') === 'true',
    sync_remote_url: getAuthConfigValue('sync_remote_url') ?? '',
    sync_ingest_key: getAuthConfigValue('sync_ingest_key') ?? '',
    sync_interval_minutes: Number(getAuthConfigValue('sync_interval_minutes')) || 5,
    sync_last_id: Number(getAuthConfigValue('sync_last_id')) || 0,
    sync_last_time: getAuthConfigValue('sync_last_time') ?? '',
    sync_last_error: getAuthConfigValue('sync_last_error') ?? '',
    sync_last_count: Number(getAuthConfigValue('sync_last_count')) || 0,
    ingest_key: getAuthConfigValue('ingest_key') ?? '',
  }
}

/**
 * Save sync configuration (only the user-editable fields)
 */
export function saveSyncConfig(config: {
  sync_enabled?: boolean
  sync_remote_url?: string
  sync_ingest_key?: string
  sync_interval_minutes?: number
}): void {
  if (config.sync_enabled !== undefined)
    setAuthConfigValue('sync_enabled', config.sync_enabled ? 'true' : 'false')
  if (config.sync_remote_url !== undefined)
    setAuthConfigValue('sync_remote_url', config.sync_remote_url)
  if (config.sync_ingest_key !== undefined)
    setAuthConfigValue('sync_ingest_key', config.sync_ingest_key)
  if (config.sync_interval_minutes !== undefined)
    setAuthConfigValue('sync_interval_minutes', String(config.sync_interval_minutes))
}

/**
 * Update sync status fields (called by sync engine)
 */
export function updateSyncStatus(status: {
  sync_last_id?: number
  sync_last_time?: string
  sync_last_error?: string
  sync_last_count?: number
}): void {
  if (status.sync_last_id !== undefined)
    setAuthConfigValue('sync_last_id', String(status.sync_last_id))
  if (status.sync_last_time !== undefined)
    setAuthConfigValue('sync_last_time', status.sync_last_time)
  if (status.sync_last_error !== undefined)
    setAuthConfigValue('sync_last_error', status.sync_last_error)
  if (status.sync_last_count !== undefined)
    setAuthConfigValue('sync_last_count', String(status.sync_last_count))
}

/**
 * Get unsynced records after the given lastId
 */
export function getUnsyncedRecords(lastId: number, limit: number = 500): (RemoteUsageEntry & { id: number })[] {
  const db = getUsageDb()
  return db.prepare(`
    SELECT id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms, user_agent, hostname
    FROM usage_log
    WHERE id > ?
    ORDER BY id ASC
    LIMIT ?
  `).all(lastId, limit) as (RemoteUsageEntry & { id: number })[]
}

/**
 * Ensure an ingest key exists; generate one if missing
 */
export function ensureIngestKey(): string {
  const existing = getAuthConfigValue('ingest_key')
  if (existing)
    return existing

  const key = randomBytes(32).toString('hex')
  setAuthConfigValue('ingest_key', key)
  return key
}
