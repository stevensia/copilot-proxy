/**
 * Dashboard authentication module
 * Password auth with brute-force protection
 */

import { getUsageDb } from './usage-db'

const LOCKOUT_THRESHOLD = 5 // Failed attempts before lockout
const LOCKOUT_WINDOW_MINUTES = 5 // Window for counting failures
const LOCKOUT_DURATION_MINUTES = 15 // Lockout duration
const SESSION_EXPIRY_HOURS = 24 // Session token expiry

// In-memory session store (simple approach)
const sessions: Map<string, { expires: number }> = new Map()

/**
 * Check if password is set
 */
export function isPasswordSet(): boolean {
  const db = getUsageDb()
  const result = db.prepare(
    'SELECT value FROM auth_config WHERE key = \'password_hash\'',
  ).get() as { value: string } | undefined
  return !!result?.value
}

/**
 * Set dashboard password (first-time setup or change)
 */
export async function setPassword(password: string): Promise<void> {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const hash = await Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 10,
  })

  const db = getUsageDb()
  db.prepare(`
    INSERT OR REPLACE INTO auth_config (key, value) VALUES ('password_hash', ?)
  `).run(hash)
}

/**
 * Check if IP is locked out
 */
export function isLockedOut(ip: string): boolean {
  const db = getUsageDb()

  // Check recent failed attempts
  const result = db.prepare(`
    SELECT COUNT(*) as cnt FROM login_attempts
    WHERE ip = ? AND success = 0
    AND timestamp > datetime('now', '-${LOCKOUT_WINDOW_MINUTES} minutes')
  `).get(ip) as { cnt: number }

  if (result.cnt >= LOCKOUT_THRESHOLD) {
    // Check if still in lockout period
    const lastAttempt = db.prepare(`
      SELECT timestamp FROM login_attempts
      WHERE ip = ? AND success = 0
      ORDER BY timestamp DESC LIMIT 1
    `).get(ip) as { timestamp: string } | undefined

    if (lastAttempt) {
      const lockoutUntil = new Date(lastAttempt.timestamp)
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES)
      return new Date() < lockoutUntil
    }
  }

  return false
}

/**
 * Get remaining lockout seconds
 */
export function getLockoutRemaining(ip: string): number {
  const db = getUsageDb()

  const lastAttempt = db.prepare(`
    SELECT timestamp FROM login_attempts
    WHERE ip = ? AND success = 0
    ORDER BY timestamp DESC LIMIT 1
  `).get(ip) as { timestamp: string } | undefined

  if (!lastAttempt)
    return 0

  const lockoutUntil = new Date(lastAttempt.timestamp)
  lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES)

  const remaining = Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000)
  return Math.max(0, remaining)
}

/**
 * Record login attempt
 */
function recordAttempt(ip: string, success: boolean): void {
  const db = getUsageDb()
  db.prepare(`
    INSERT INTO login_attempts (ip, success) VALUES (?, ?)
  `).run(ip, success ? 1 : 0)

  // Cleanup old attempts (older than 1 day)
  db.prepare(`
    DELETE FROM login_attempts WHERE timestamp < datetime('now', '-1 day')
  `).run()
}

/**
 * Verify password and return session token
 */
export async function verifyPassword(password: string, ip: string): Promise<string | null> {
  // Check lockout first
  if (isLockedOut(ip)) {
    return null
  }

  const db = getUsageDb()
  const result = db.prepare(
    'SELECT value FROM auth_config WHERE key = \'password_hash\'',
  ).get() as { value: string } | undefined

  if (!result?.value) {
    // No password set, this shouldn't happen in normal flow
    return null
  }

  const valid = await Bun.password.verify(password, result.value)

  // Record attempt
  recordAttempt(ip, valid)

  if (!valid) {
    return null
  }

  // Generate session token
  const token = generateToken()
  const expires = Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000
  sessions.set(token, { expires })

  return token
}

/**
 * Validate session token
 */
export function validateSession(token: string): boolean {
  const session = sessions.get(token)
  if (!session)
    return false

  if (Date.now() > session.expires) {
    sessions.delete(token)
    return false
  }

  return true
}

/**
 * Invalidate session (logout)
 */
export function invalidateSession(token: string): void {
  sessions.delete(token)
}

/**
 * Generate random token
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Cleanup expired sessions (call periodically)
 */
export function cleanupSessions(): void {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now > session.expires) {
      sessions.delete(token)
    }
  }
}

/**
 * Get failed attempts count for IP
 */
export function getFailedAttempts(ip: string): number {
  const db = getUsageDb()
  const result = db.prepare(`
    SELECT COUNT(*) as cnt FROM login_attempts
    WHERE ip = ? AND success = 0
    AND timestamp > datetime('now', '-${LOCKOUT_WINDOW_MINUTES} minutes')
  `).get(ip) as { cnt: number }
  return result.cnt
}
