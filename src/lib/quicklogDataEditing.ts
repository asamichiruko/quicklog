import type { LogEntry, LogEntryDeletion, QuicklogData } from "@/types"
import { mergeLogEntryDeletions } from "@/lib/logEntryDeletionCollection"

export function createLogEntry(text: string, now: Date, id: string): LogEntry {
  return { id, text, createdAt: now.toISOString() }
}

export function appendLogEntry(data: QuicklogData, logEntry: LogEntry): QuicklogData {
  const nextEntries = [...data.logEntries, logEntry]
  return {
    ...data,
    logEntries: nextEntries,
  }
}

export function createLogEntryDeletion(logEntryId: string, now: Date): LogEntryDeletion {
  return { logEntryId, createdAt: now.toISOString() }
}

export function removeLogEntry(
  data: QuicklogData,
  logEntryDeletion: LogEntryDeletion,
): QuicklogData {
  const nextLogEntries = data.logEntries.filter(
    (logEntry) => logEntry.id !== logEntryDeletion.logEntryId,
  )
  const nextLogEntryDeletions = mergeLogEntryDeletions(data.logEntryDeletions, [logEntryDeletion])
  return {
    ...data,
    logEntries: nextLogEntries,
    logEntryDeletions: nextLogEntryDeletions,
  }
}
