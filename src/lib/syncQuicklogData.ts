import type { LogEntry, QuicklogData, SyncOperation } from "@/types";
import { sortLogEntriesByCreatedAtAsc } from "@/lib/logEntryCollection";

export function mergeQuicklogData(existing: QuicklogData, incoming: QuicklogData): QuicklogData {
  // 異なるデータ同士で id の衝突はないという前提でマージを行う

  // union each logEntries
  const logEntriesById = new Map<string, LogEntry>()

  existing.logEntries.forEach((logEntry) => {
    logEntriesById.set(logEntry.id, logEntry)
  })

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

  return {
    version: 2,
    logEntries: sortLogEntriesByCreatedAtAsc([...logEntriesById.values()]),
    syncOperations: [...syncOperationsById.values()]
  }
}
