import type { QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { syncQuicklogDataWithCloud, type CloudQuicklogDataSyncResult } from "./quicklogDataSync"

export type CloudSyncContext = {
  user: User | null
  data: QuicklogData
}

export type CloudSyncQueueOptions = {
  getContext: () => CloudSyncContext
  applyResult: (result: CloudQuicklogDataSyncResult, context: CloudSyncContext) => void
  sync?: typeof syncQuicklogDataWithCloud
  onError?: (error: unknown) => void
}

export function createCloudSyncQueue(options: CloudSyncQueueOptions) {
  let activeRequest: Promise<CloudQuicklogDataSyncResult | null> | null = null
  let requested = false

  function request(): Promise<CloudQuicklogDataSyncResult | null> {
    requested = true
    activeRequest ??= run()
    return activeRequest
  }

  async function run(): Promise<CloudQuicklogDataSyncResult | null> {
    try {
      let lastResult: CloudQuicklogDataSyncResult | null = null

      while (requested) {
        requested = false

        const context = options.getContext()
        if (!context.user) continue

        const result = await (options.sync ?? syncQuicklogDataWithCloud)(context.data, context.user)
        options.applyResult(result, context)
        lastResult = result
      }

      return lastResult
    } catch (error) {
      options.onError?.(error)
      throw error
    } finally {
      activeRequest = null
    }
  }

  return { request }
}
