import type { LogEntry, QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { mergeLogEntries } from "@/lib/logEntryCollection"
import { fetchCloudLogEntries, upsertCloudLogEntries } from "@/lib/logEntryRepository"

export type CloudLogEntrySyncResult = {
  data: QuicklogData
  addedCount: number
  uploadedCount: number
}

export function mergeLogEntriesWithCloud(
  localData: QuicklogData,
  cloudLogEntries: LogEntry[],
): CloudLogEntrySyncResult {
  const localLogEntryIds = new Set(localData.logEntries.map((entry) => entry.id))
  const cloudLogEntryIds = new Set(cloudLogEntries.map((entry) => entry.id))
  const logEntries = mergeLogEntries(localData.logEntries, cloudLogEntries)

  return {
    data: {
      ...localData,
      logEntries,
    },
    addedCount: cloudLogEntries.filter((entry) => !localLogEntryIds.has(entry.id)).length,
    uploadedCount: localData.logEntries.filter((entry) => !cloudLogEntryIds.has(entry.id)).length,
  }
}

export async function syncLogEntriesWithCloud(
  localData: QuicklogData,
  user: User,
): Promise<CloudLogEntrySyncResult> {
  const cloudLogEntries = await fetchCloudLogEntries(user)
  const result = mergeLogEntriesWithCloud(localData, cloudLogEntries)

  await upsertCloudLogEntries(result.data.logEntries, user)

  return result
}
