import type { QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { fetchCloudLogEntries, upsertCloudLogEntries } from "@/lib/logEntryRepository"
import { fetchCloudLogEntryDeletions, recordLogEntryDeletions } from "@/lib/logEntryDeletionRepository"
import { mergeQuicklogData } from "@/lib/quicklogDataMerge"


export type CloudQuicklogDataSyncResult = {
  data: QuicklogData
  addedCount: number
  deletedCount: number
  uploadedCount: number
}

export function mergeQuicklogDataWithCloud(
  localData: QuicklogData,
  cloudData: QuicklogData,
): CloudQuicklogDataSyncResult {
  const cloudLogEntryIds = new Set(cloudData.logEntries.map((entry) => entry.id))
  const result = mergeQuicklogData(localData, cloudData)
  const deletedLogEntryIds = new Set(result.data.logEntryDeletions.map((deletion) => deletion.logEntryId))

  return {
    data: result.data,
    addedCount: result.addedCount,
    deletedCount: result.deletedCount,
    uploadedCount: localData.logEntries.filter((entry) => !cloudLogEntryIds.has(entry.id) && !deletedLogEntryIds.has(entry.id)).length,
  }
}

export async function syncQuicklogDataWithCloud(
  localData: QuicklogData,
  user: User,
): Promise<CloudQuicklogDataSyncResult> {
  const cloudLogEntries = await fetchCloudLogEntries(user)
  const cloudLogEntryDeletions = await fetchCloudLogEntryDeletions(user)
  const result = mergeQuicklogDataWithCloud(localData, {
    version: 3,
    logEntries: cloudLogEntries,
    logEntryDeletions: cloudLogEntryDeletions,
  })

  await upsertCloudLogEntries(result.data.logEntries, user)
  await recordLogEntryDeletions(result.data.logEntryDeletions, user)

  return result
}
