import type { LogEntry, QuicklogData, LogEntryDeletion } from "@/types"
import { mergeLogEntryDeletions } from "@/lib/logEntryDeletionCollection"
import { sortLogEntriesByCreatedAtAsc } from "@/lib/logEntryCollection"
import { addDays, startOfLocalDay } from "@/lib/date"

export type QuicklogDataMergeResult = {
  data: QuicklogData
  addedCount: number
  deletedCount: number
}

const LOG_ENTRY_DELETION_RETENTION_DAYS = 60

export function mergeQuicklogData(
  existing: QuicklogData,
  incoming: QuicklogData,
): QuicklogDataMergeResult {
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

  // union each logEntryDeletions
  const logEntryDeletions = mergeLogEntryDeletions(
    existing.logEntryDeletions,
    incoming.logEntryDeletions,
  )

  // apply logEntryDeletions
  logEntryDeletions.forEach((logEntryDeletion) => {
    logEntriesById.delete(logEntryDeletion.logEntryId)
  })

  const result = {
    version: 3,
    logEntries: sortLogEntriesByCreatedAtAsc([...logEntriesById.values()]),
    logEntryDeletions,
  } satisfies QuicklogData

  const addedCount = result.logEntries.filter((entry) => !existingLogEntryIds.has(entry.id)).length
  const deletedCount = existing.logEntries.filter((entry) => !logEntriesById.has(entry.id)).length

  return { data: result, addedCount, deletedCount }
}

export function pruneQuicklogDataLogEntryDeletions(data: QuicklogData, today: Date): QuicklogData {
  return {
    ...data,
    logEntryDeletions: pruneExpiredLogEntryDeletions(data.logEntryDeletions, today),
  }
}

export function pruneExpiredLogEntryDeletions(
  data: LogEntryDeletion[],
  today: Date,
  retentionDays = LOG_ENTRY_DELETION_RETENTION_DAYS,
): LogEntryDeletion[] {
  const pruned = mergeLogEntryDeletions(data).filter((logEntryDeletion) => {
    return (
      addDays(new Date(logEntryDeletion.createdAt), retentionDays).getTime() >=
      startOfLocalDay(today).getTime()
    )
  })

  return pruned
}

export function mergeImportedQuicklogData(
  currentData: QuicklogData,
  importedData: QuicklogData,
  now: Date,
): QuicklogDataMergeResult {
  return mergeQuicklogData(
    {
      ...currentData,
      logEntryDeletions: pruneExpiredLogEntryDeletions(currentData.logEntryDeletions, now),
    },
    pruneQuicklogDataLogEntryDeletions(importedData, now),
  )
}
