import type { LogEntry, QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { mergeLogEntries } from "@/lib/logEntryCollection"
import { fetchRemoteLogEntries, upsertRemoteLogEntries } from "@/lib/logEntryRepository"

export type CloudLogEntrySyncResult = {
  data: QuicklogData
  addedCount: number
  uploadedCount: number
}

export function mergeLogEntriesWithRemote(
  localData: QuicklogData,
  remoteLogEntries: LogEntry[],
): CloudLogEntrySyncResult {
  const localLogEntryIds = new Set(localData.logEntries.map((entry) => entry.id))
  const remoteLogEntryIds = new Set(remoteLogEntries.map((entry) => entry.id))
  const logEntries = mergeLogEntries(localData.logEntries, remoteLogEntries)

  return {
    data: {
      ...localData,
      logEntries,
    },
    addedCount: remoteLogEntries.filter((entry) => !localLogEntryIds.has(entry.id)).length,
    uploadedCount: localData.logEntries.filter((entry) => !remoteLogEntryIds.has(entry.id)).length,
  }
}

export async function syncLogEntriesWithRemote(
  localData: QuicklogData,
  user: User,
): Promise<CloudLogEntrySyncResult> {
  const remoteLogEntries = await fetchRemoteLogEntries(user)
  const result = mergeLogEntriesWithRemote(localData, remoteLogEntries)

  await upsertRemoteLogEntries(result.data.logEntries, user)

  return result
}
