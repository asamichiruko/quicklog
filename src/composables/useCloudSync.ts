import { createCloudSyncQueue } from "@/lib/cloudSyncQueue"
import { createCloudSyncScheduler } from "@/lib/cloudSyncScheduler"
import { syncQuicklogDataWithCloud, type CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import type { QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { onMounted, onUnmounted } from "vue"

export function useCloudSync(options: {
  getActiveUser: () => User | null
  getData: () => QuicklogData
  getDataRevision: () => number
  getScopeRevision: () => number
  applySyncedData: (data: QuicklogData) => void
}) {
  const cloudSyncQueue = createCloudSyncQueue({
    getContext() {
      return {
        user: options.getActiveUser(),
        data: options.getData(),
        dataRevision: options.getDataRevision(),
        scopeRevision: options.getScopeRevision(),
      }
    },
    sync: syncQuicklogDataWithCloud,
    applyResult: (result, context) => {
      const currentUser = options.getActiveUser()

      if (!currentUser || !context.user || currentUser.id !== context.user.id) return
      if (context.dataRevision !== options.getDataRevision()) {
        cloudSyncScheduler.scheduleAfterLocalChange()
        return
      }
      if (context.scopeRevision !== options.getScopeRevision()) return

      options.applySyncedData(result.data)
    },
  })

  const cloudSyncScheduler = createCloudSyncScheduler({
    canSync: () => Boolean(options.getActiveUser()),
    requestSync: () => cloudSyncQueue.request(),
    onError: warnSyncError,
    autoSyncDelayMs: 1_000,
  })

  function requestNow(): Promise<CloudQuicklogDataSyncResult | null> {
    return cloudSyncScheduler.requestNow()
  }

  function requestNowSilently() {
    void cloudSyncScheduler.requestNow().catch(warnSyncError)
  }

  function requestIfDue() {
    cloudSyncScheduler.requestIfDue()
  }

  function scheduleAfterLocalChange() {
    cloudSyncScheduler.scheduleAfterLocalChange()
  }

  function cancelScheduled() {
    cloudSyncScheduler.cancelScheduled()
  }

  function warnSyncError(error: unknown) {
    console.warn("Failed to sync quicklog data", error)
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== "visible") return
    cloudSyncScheduler.requestIfDue()
  }

  function handleOnline() {
    cloudSyncScheduler.requestIfDue()
  }

  onMounted(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("online", handleOnline)
  })

  onUnmounted(() => {
    cloudSyncScheduler.cancelScheduled()
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("online", handleOnline)
  })

  return {
    requestNow,
    requestNowSilently,
    requestIfDue,
    scheduleAfterLocalChange,
    cancelScheduled,
  }
}
