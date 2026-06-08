const DEFAULT_AUTO_SYNC_DELAY_MS = 1_000
const DEFAULT_COOLDOWN_DELAY_MS = 60_000

export type CloudSyncSchedulerOptions = {
  canSync: () => boolean
  requestSync: () => Promise<unknown>
  onError?: (error: unknown) => void
  now?: () => number
  setTimeout?: typeof window.setTimeout
  clearTimeout?: typeof window.clearTimeout
  autoSyncDelayMs?: number
  cooldownMs?: number
}

export function createCloudSyncScheduler(options: CloudSyncSchedulerOptions) {
  let timeoutId: ReturnType<typeof window.setTimeout> | undefined
  let lastRequestedAt = 0

  function scheduleAfterLocalChange() {
    cancelScheduled()
    if (!options.canSync()) return

    const setTimeout = options.setTimeout ?? window.setTimeout
    timeoutId = setTimeout(() => {
      timeoutId = undefined
      requestSilently()
    }, options.autoSyncDelayMs ?? DEFAULT_AUTO_SYNC_DELAY_MS)
  }

  function requestIfDue() {
    if (!options.canSync()) return

    const now = options.now?.() ?? Date.now()
    if (now - lastRequestedAt < (options.cooldownMs ?? DEFAULT_COOLDOWN_DELAY_MS)) return

    requestSilently()
  }

  function requestNow() {
    cancelScheduled()
    lastRequestedAt = options.now?.() ?? Date.now()
    return options.requestSync()
  }

  function cancelScheduled() {
    if (timeoutId === undefined) return
    const clearTimeout = options.clearTimeout ?? window.clearTimeout
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  function requestSilently() {
    if (!options.canSync()) return

    lastRequestedAt = options.now?.() ?? Date.now()
    void options.requestSync().catch((error) => {
      options.onError?.(error)
    })
  }

  return {
    scheduleAfterLocalChange,
    requestIfDue,
    requestNow,
    cancelScheduled,
  }
}
