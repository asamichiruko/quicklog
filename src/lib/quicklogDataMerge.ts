import type { LogEntry, QuicklogData, SyncOperation } from "@/types"
import { sortLogEntriesByCreatedAtAsc } from "@/lib/logEntryCollection"
import { addDays, startOfLocalDay } from "@/lib/date"

export type QuicklogDataMergeResult = {
  data: QuicklogData,
  addedCount: number,
  deletedCount: number,
}

const SYNC_OPERATION_RETENTION_DAYS = 60

export function mergeQuicklogData(existing: QuicklogData, incoming: QuicklogData): QuicklogDataMergeResult {
  // 異なるデータ同士で id の衝突はないという前提でマージを行う

  // union each logEntries
  const logEntriesById = new Map<string, LogEntry>()

  existing.logEntries.forEach((logEntry) => {
    logEntriesById.set(logEntry.id, logEntry)
  })

  const existingLogEntryIds = new Set<string>(logEntriesById.keys())

  incoming.logEntries.forEach((logEntry) => {
    logEntriesById.set(logEntry.id, logEntry)
  })

  // union each syncOperations
  const syncOperationsById = new Map<string, SyncOperation>()

  existing.syncOperations.forEach((syncOperation) => {
    syncOperationsById.set(syncOperation.id, syncOperation)
  })

  incoming.syncOperations.forEach((syncOperation) => {
    syncOperationsById.set(syncOperation.id, syncOperation)
  })

  // apply deleteOperations
  syncOperationsById.forEach((syncOperation) => {
    if (syncOperation.type === "delete") {
      logEntriesById.delete(syncOperation.entryId)
    }
  })

  const result = {
    version: 2,
    logEntries: sortLogEntriesByCreatedAtAsc([...logEntriesById.values()]),
    syncOperations: [...syncOperationsById.values()]
  } satisfies QuicklogData

  const addedCount = result.logEntries.filter((entry) => !existingLogEntryIds.has(entry.id)).length
  const deletedCount = existing.logEntries.filter((entry) => !logEntriesById.has(entry.id)).length

  return { data: result, addedCount, deletedCount }
}

export function pruneQuicklogDataSyncOperations(data: QuicklogData, today: Date): QuicklogData {
  return {
    ...data,
    syncOperations: pruneExpiredSyncOperations(data.syncOperations, today)
  }
}

export function pruneExpiredSyncOperations(data: SyncOperation[], today: Date, retentionDays = SYNC_OPERATION_RETENTION_DAYS): SyncOperation[] {
  const pruned = data.filter((syncOperation) => {
    return addDays(new Date(syncOperation.createdAt), retentionDays).getTime() >= startOfLocalDay(today).getTime()
  })

  return pruned
}
