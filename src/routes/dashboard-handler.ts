/**
 * Dashboard API routes
 * Provides usage statistics and authentication endpoints
 */

import type { Context, Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  getFailedAttempts,
  getLockoutRemaining,
  invalidateSession,
  isLockedOut,
  isPasswordSet,
  setPassword,
  validateSession,
  verifyPassword,
} from '../lib/dashboard-auth'
import {
  ensureIngestKey,
  exportToCsv,
  getActivityMetrics,
  getAllPricing,
  getDailyUsage,
  getHostnames,
  getHourlyUsage,
  getModelUsage,
  getRecentUsage,
  getSourceUsage,
  getStats,
  getSyncConfig,
  getTodayStats,
  getTotalCost,
  getYesterdayCost,
  ingestRemoteUsage,
  savePricing,
  saveSyncConfig,
} from '../lib/usage-db'
import { startUsageSync, stopUsageSync, syncOnce } from '../lib/usage-sync'
import { activityPageHtml, dashboardHtml } from './dashboard-ui'

const COOKIE_NAME = 'copilot_proxy_session'

/**
 * Get client IP from request
 */
function getClientIp(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown'
}

/**
 * Calculate 'since' date from hours parameter
 */
function getSinceDate(hours: number | undefined): string | undefined {
  if (!hours || hours <= 0)
    return undefined
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  return since.toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * Register dashboard routes
 */
export function registerDashboardRoutes(app: Hono): void {
  // Serve dashboard UI
  app.get('/dashboard', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    const isAuthenticated = !!(token && validateSession(token))
    const needsSetup = !isPasswordSet()

    return c.html(dashboardHtml(isAuthenticated, needsSetup))
  })

  // Serve activity page
  app.get('/dashboard/activity', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    const isAuthenticated = !!(token && validateSession(token))
    const needsSetup = !isPasswordSet()

    return c.html(activityPageHtml(isAuthenticated, needsSetup))
  })

  // Check auth status
  app.get('/dashboard/api/status', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    const isAuthenticated = token && validateSession(token)
    const needsSetup = !isPasswordSet()
    const ip = getClientIp(c)

    return c.json({
      authenticated: isAuthenticated,
      needsSetup,
      locked: isLockedOut(ip),
      lockoutRemaining: getLockoutRemaining(ip),
      failedAttempts: getFailedAttempts(ip),
    })
  })

  // Setup password (first time)
  app.post('/dashboard/api/setup', async (c) => {
    if (isPasswordSet()) {
      return c.json({ error: 'Password already set' }, 400)
    }

    const { password } = await c.req.json<{ password: string }>()

    try {
      await setPassword(password)

      // Auto-login after setup
      const ip = getClientIp(c)
      const token = await verifyPassword(password, ip)

      if (token) {
        setCookie(c, COOKIE_NAME, token, {
          httpOnly: true,
          secure: false, // Allow HTTP for local development
          sameSite: 'Lax',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/',
        })
      }

      return c.json({ success: true })
    }
    catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // Login
  app.post('/dashboard/api/login', async (c) => {
    const ip = getClientIp(c)

    // Check lockout
    if (isLockedOut(ip)) {
      const remaining = getLockoutRemaining(ip)
      return c.json({
        error: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60)} minutes.`,
        code: 'LOCKED_OUT',
        lockoutRemaining: remaining,
      }, 429)
    }

    const { password } = await c.req.json<{ password: string }>()
    const token = await verifyPassword(password, ip)

    if (!token) {
      const attempts = getFailedAttempts(ip)
      const remaining = 5 - attempts
      return c.json({
        error: `Invalid password. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Account locked.'}`,
        code: 'INVALID_PASSWORD',
        attemptsRemaining: remaining,
      }, 401)
    }

    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    return c.json({ success: true })
  })

  // Logout
  app.post('/dashboard/api/logout', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (token) {
      invalidateSession(token)
      deleteCookie(c, COOKIE_NAME, { path: '/' })
    }
    return c.json({ success: true })
  })

  // === Protected API routes ===

  // Stats summary
  app.get('/dashboard/api/stats', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hours = Number(c.req.query('hours')) || 0
    const since = getSinceDate(hours)

    const stats = getStats(since)
    const today = getTodayStats()
    const totalCost = getTotalCost(since)
    const yesterdayCost = getYesterdayCost()
    const periodDays = hours > 0 ? Math.max(1, Math.round(hours / 24)) : null

    return c.json({
      stats,
      today,
      hours,
      totalCost,
      yesterdayCost,
      periodDays,
    })
  })

  // Hourly usage
  app.get('/dashboard/api/hourly', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const raw = c.req.query('hours')
    const hours = raw !== undefined ? Number(raw) : 24
    const since = getSinceDate(hours)

    return c.json(getHourlyUsage(since))
  })

  // Daily usage
  app.get('/dashboard/api/daily', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hours = Number(c.req.query('hours')) || 0
    const since = getSinceDate(hours)

    return c.json(getDailyUsage(since))
  })

  // Model usage
  app.get('/dashboard/api/models', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hours = Number(c.req.query('hours')) || 0
    const since = getSinceDate(hours)

    return c.json(getModelUsage(since))
  })

  // Usage by source
  app.get('/dashboard/api/sources', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hours = Number(c.req.query('hours')) || 0
    const since = getSinceDate(hours)

    return c.json(getSourceUsage(since))
  })

  // Recent records
  app.get('/dashboard/api/recent', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const limit = Math.min(Number(c.req.query('limit')) || 50, 500)
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0)

    return c.json(getRecentUsage(limit, offset))
  })

  // Activity metrics
  app.get('/dashboard/api/activity-metrics', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hours = Number(c.req.query('hours')) || 0
    const since = getSinceDate(hours)

    return c.json(getActivityMetrics(since))
  })

  // Export CSV
  app.get('/dashboard/api/export', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hours = Number(c.req.query('hours')) || 0
    const since = getSinceDate(hours)

    const csv = exportToCsv(since)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="copilot-usage-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  })

  // Get pricing data
  app.get('/dashboard/api/pricing', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json(getAllPricing())
  })

  // Update pricing data
  app.post('/dashboard/api/pricing', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const pricing = await c.req.json<Record<string, { input: number, output: number }>>()
      savePricing(pricing)
      return c.json({ success: true })
    }
    catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // Get all known hostnames
  app.get('/dashboard/api/hostnames', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    return c.json(getHostnames())
  })

  // Remote usage ingest endpoint
  // Other machines POST their usage records here
  // Auth: same dashboard password via Bearer token or cookie
  app.post('/dashboard/api/ingest', async (c) => {
    // Auth via cookie or Bearer token (for machine-to-machine)
    const cookieToken = getCookie(c, COOKIE_NAME)
    const bearerToken = c.req.header('Authorization')?.replace('Bearer ', '')

    let authed = false
    if (cookieToken && validateSession(cookieToken))
      authed = true
    if (!authed && bearerToken) {
      // Verify bearer token is a valid session
      if (validateSession(bearerToken))
        authed = true
    }

    // Also support a simple shared secret via X-Ingest-Key header
    const ingestKey = c.req.header('X-Ingest-Key')
    if (!authed && ingestKey) {
      const db = (await import('../lib/usage-db')).getUsageDb()
      const stored = db.prepare(`SELECT value FROM auth_config WHERE key = 'ingest_key'`).get() as { value: string } | undefined
      if (stored && stored.value === ingestKey)
        authed = true
    }

    if (!authed) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const body = await c.req.json<{ records: any[] }>()
      if (!body.records || !Array.isArray(body.records)) {
        return c.json({ error: 'Missing records array' }, 400)
      }

      const count = ingestRemoteUsage(body.records)
      return c.json({ success: true, ingested: count })
    }
    catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // Set/get ingest key for remote machines
  app.post('/dashboard/api/ingest-key', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { key } = await c.req.json<{ key: string }>()
    const db = (await import('../lib/usage-db')).getUsageDb()
    db.prepare(`INSERT OR REPLACE INTO auth_config (key, value) VALUES ('ingest_key', ?)`).run(key)
    return c.json({ success: true })
  })

  app.get('/dashboard/api/ingest-key', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const db = (await import('../lib/usage-db')).getUsageDb()
    const row = db.prepare(`SELECT value FROM auth_config WHERE key = 'ingest_key'`).get() as { value: string } | undefined
    return c.json({ key: row?.value || null })
  })

  // === Sync config routes ===

  // Get sync configuration + status
  app.get('/dashboard/api/sync-config', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json(getSyncConfig())
  })

  // Save sync configuration and restart timer
  app.post('/dashboard/api/sync-config', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const body = await c.req.json<{
        sync_enabled?: boolean
        sync_remote_url?: string
        sync_ingest_key?: string
        sync_interval_minutes?: number
      }>()

      saveSyncConfig(body)

      // Restart sync timer with new config
      stopUsageSync()
      startUsageSync()

      return c.json({ success: true })
    }
    catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // Manually trigger a single sync
  app.post('/dashboard/api/sync-now', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const result = await syncOnce()
    return c.json(result)
  })

  // Get connection info for other machines to connect to this server
  app.get('/dashboard/api/connect-info', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const ingestKey = ensureIngestKey()
    return c.json({ ingestKey })
  })
}
