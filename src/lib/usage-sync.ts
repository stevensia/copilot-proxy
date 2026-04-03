/**
 * Usage sync engine
 * Periodically pushes local usage_log records to a remote server
 */

import { hostname } from 'node:os'
import consola from 'consola'
import { getSyncConfig, getUnsyncedRecords, updateSyncStatus } from './usage-db'

const LOCAL_HOSTNAME = hostname()
let syncTimer: ReturnType<typeof setInterval> | null = null

/**
 * Start the periodic sync timer based on current config
 */
export function startUsageSync(): void {
  stopUsageSync()

  const config = getSyncConfig()
  if (!config.sync_enabled || !config.sync_remote_url || !config.sync_ingest_key) {
    consola.debug('[UsageSync] Sync not enabled or not configured, skipping')
    return
  }

  const intervalMs = Math.max(1, config.sync_interval_minutes) * 60 * 1000
  consola.info(`[UsageSync] Starting sync every ${config.sync_interval_minutes}min to ${config.sync_remote_url}`)

  // Run once immediately, then on interval
  syncOnce().catch(e => consola.error('[UsageSync] Initial sync error:', e))
  syncTimer = setInterval(() => {
    syncOnce().catch(e => consola.error('[UsageSync] Periodic sync error:', e))
  }, intervalMs)
}

/**
 * Stop the periodic sync timer
 */
export function stopUsageSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
    consola.debug('[UsageSync] Sync timer stopped')
  }
}

/**
 * Perform a single sync cycle:
 * 1. Read last synced id
 * 2. Fetch unsynced records in batches
 * 3. POST to remote ingest endpoint
 * 4. Update watermark on success
 */
export async function syncOnce(): Promise<{ synced: number, error?: string }> {
  const config = getSyncConfig()
  if (!config.sync_remote_url || !config.sync_ingest_key) {
    const err = 'Sync not configured (missing URL or key)'
    updateSyncStatus({ sync_last_error: err })
    return { synced: 0, error: err }
  }

  let totalSynced = 0
  let lastId = config.sync_last_id
  const BATCH_SIZE = 500

  try {
    while (true) {
      const records = getUnsyncedRecords(lastId, BATCH_SIZE)
      if (records.length === 0)
        break

      // Attach local hostname to records that don't have one
      const payload = records.map(r => ({
        timestamp: r.timestamp,
        model: r.model,
        prompt_tokens: r.prompt_tokens,
        completion_tokens: r.completion_tokens,
        total_tokens: r.total_tokens,
        endpoint: r.endpoint ?? undefined,
        duration_ms: r.duration_ms ?? undefined,
        user_agent: r.user_agent ?? undefined,
        hostname: r.hostname || LOCAL_HOSTNAME,
      }))

      const url = `${config.sync_remote_url.replace(/\/+$/, '')}/dashboard/api/ingest`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ingest-Key': config.sync_ingest_key,
        },
        body: JSON.stringify({ records: payload }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body}`)
      }

      const result = await res.json() as { success: boolean, ingested: number }
      if (!result.success) {
        throw new Error('Remote returned success=false')
      }

      // Update watermark to the last record id in this batch
      lastId = records[records.length - 1].id
      totalSynced += records.length

      // Update status after each batch
      updateSyncStatus({
        sync_last_id: lastId,
        sync_last_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        sync_last_count: totalSynced,
        sync_last_error: '',
      })

      consola.debug(`[UsageSync] Synced batch of ${records.length} records (total: ${totalSynced})`)

      // If we got fewer than BATCH_SIZE, we're done
      if (records.length < BATCH_SIZE)
        break
    }

    if (totalSynced > 0) {
      consola.info(`[UsageSync] Synced ${totalSynced} records`)
    }

    return { synced: totalSynced }
  }
  catch (e: any) {
    const errorMsg = e.message || String(e)
    consola.error(`[UsageSync] Sync failed: ${errorMsg}`)
    updateSyncStatus({
      sync_last_error: errorMsg,
      sync_last_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    return { synced: totalSynced, error: errorMsg }
  }
}
