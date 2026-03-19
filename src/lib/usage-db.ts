/**
 * Usage tracking database module
 * Cross-platform SQLite storage for API usage logs
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const APP_DIR = join(homedir(), '.copilot-proxy')
const DB_PATH = join(APP_DIR, 'usage.db')

let db: Database | null = null

/**
 * Initialize database connection and schema
 */
export function getUsageDb(): Database {
  if (db) return db

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
      user_agent TEXT
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_log(model);
    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(date(timestamp));

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
}

export function logUsage(entry: UsageLogEntry): void {
  try {
    const db = getUsageDb()
    db.prepare(`
      INSERT INTO usage_log (timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms, client_ip, user_agent)
      VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.model,
      entry.prompt_tokens,
      entry.completion_tokens,
      entry.total_tokens,
      entry.endpoint ?? null,
      entry.duration_ms ?? null,
      entry.client_ip ?? null,
      entry.user_agent ?? null
    )
  } catch (e) {
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
}

export function getHourlyUsage(since?: string): HourlyUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  return db.prepare(`
    SELECT
      strftime('%Y-%m-%d %H:00', timestamp) as hour,
      COUNT(*) as calls,
      SUM(total_tokens) as tokens
    FROM usage_log
    ${whereClause}
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
 * Get usage by model
 */
export interface ModelUsage {
  model: string
  calls: number
  tokens: number
  prompt_tokens: number
  completion_tokens: number
}

export function getModelUsage(since?: string): ModelUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  // Calculate incremental prompt tokens for /v1/messages endpoint
  return db.prepare(`
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
  `).all(...params) as ModelUsage[]
}

/**
 * Get usage by source (user agent)
 */
export interface SourceUsage {
  source: string
  calls: number
  tokens: number
}

export function getSourceUsage(since?: string): SourceUsage[] {
  const db = getUsageDb()
  const whereClause = since ? 'WHERE timestamp >= ?' : ''
  const params = since ? [since] : []

  const rows = db.prepare(`
    SELECT 
      user_agent,
      COUNT(*) as calls,
      SUM(completion_tokens) as tokens
    FROM usage_log
    ${whereClause}
    GROUP BY user_agent
    ORDER BY tokens DESC
  `).all(...params) as { user_agent: string | null, calls: number, tokens: number }[]

  return rows.map(r => ({
    source: parseSource(r.user_agent) || 'Unknown',
    calls: r.calls,
    tokens: r.tokens
  }))
}

/**
 * Get recent usage records
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
}

function parseSource(userAgent: string | null): string | null {
  if (!userAgent) return null
  if (userAgent.includes('claude-cli')) return 'Claude Code'
  if (userAgent.includes('OpenAI/JS')) return 'OpenClaw'
  if (userAgent.includes('curl')) return 'curl'
  return userAgent.split('/')[0] || userAgent
}

export function getRecentUsage(limit: number = 50): RecentUsage[] {
  const db = getUsageDb()
  const rows = db.prepare(`
    SELECT id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, endpoint, duration_ms, user_agent
    FROM usage_log
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as (RecentUsage & { user_agent: string | null })[]
  
  return rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    model: r.model,
    prompt_tokens: r.prompt_tokens,
    completion_tokens: r.completion_tokens,
    total_tokens: r.total_tokens,
    endpoint: r.endpoint,
    duration_ms: r.duration_ms,
    source: parseSource(r.user_agent)
  }))
}

/**
 * Get today's stats
 */
export function getTodayStats(): UsageStats {
  const db = getUsageDb()
  return db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      COALESCE(SUM(total_tokens), 0) as total_tokens,
      COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as total_completion_tokens
    FROM usage_log
    WHERE date(timestamp) = date('now')
  `).get() as UsageStats
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
    `${r.timestamp},${r.model},${r.prompt_tokens},${r.completion_tokens},${r.total_tokens},${r.endpoint || ''},${r.duration_ms || ''}`
  )

  return [header, ...lines].join('\n')
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
