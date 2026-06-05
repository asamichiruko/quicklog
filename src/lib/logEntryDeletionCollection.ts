import type { LogEntryDeletion } from "@/types"

function isNewerLogEntryDeletion(existing: LogEntryDeletion, incoming: LogEntryDeletion): boolean {
  return new Date(incoming.createdAt).getTime() > new Date(existing.createdAt).getTime()
}

export function mergeLogEntryDeletions(...logEntryDeletionGroups: LogEntryDeletion[][]): LogEntryDeletion[] {
  const logEntryDeletionsByEntryId = new Map<string, LogEntryDeletion>()

  for (const logEntryDeletions of logEntryDeletionGroups) {
    for (const logEntryDeletion of logEntryDeletions) {
      const existing = logEntryDeletionsByEntryId.get(logEntryDeletion.entryId)

      if (!existing || isNewerLogEntryDeletion(existing, logEntryDeletion)) {
        logEntryDeletionsByEntryId.set(logEntryDeletion.entryId, logEntryDeletion)
      }
    }
  }

  return [...logEntryDeletionsByEntryId.values()]
}
