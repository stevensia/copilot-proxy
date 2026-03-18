/**
 * Dashboard API routes
 * Provides usage statistics and authentication endpoints
 */

import type { Context, Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import {
  isPasswordSet,
  setPassword,
  verifyPassword,
  validateSession,
  invalidateSession,
  isLockedOut,
  getLockoutRemaining,
  getFailedAttempts,
} from '../lib/dashboard-auth'
import {
  getStats,
  getHourlyUsage,
  getDailyUsage,
  getModelUsage,
  getRecentUsage,
  getTodayStats,
  exportToCsv,
} from '../lib/usage-db'
import { dashboardHtml } from './dashboard-ui'

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
 * Auth middleware
 */
function requireAuth(c: Context, next: () => Promise<Response | void>): Response | Promise<Response | void> {
  const token = getCookie(c, COOKIE_NAME)
  
  if (!token || !validateSession(token)) {
    return c.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401)
  }
  
  return next()
}

/**
 * Calculate 'since' date from hours parameter
 */
function getSinceDate(hours: number | undefined): string | undefined {
  if (!hours || hours <= 0) return undefined
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
    const isAuthenticated = token && validateSession(token)
    const needsSetup = !isPasswordSet()
    
    return c.html(dashboardHtml(isAuthenticated, needsSetup))
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
    } catch (e: any) {
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
    
    return c.json({
      stats,
      today,
      hours,
    })
  })

  // Hourly usage
  app.get('/dashboard/api/hourly', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const hours = Number(c.req.query('hours')) || 24
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

  // Recent records
  app.get('/dashboard/api/recent', (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (!token || !validateSession(token)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const limit = Math.min(Number(c.req.query('limit')) || 50, 500)
    
    return c.json(getRecentUsage(limit))
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
}
