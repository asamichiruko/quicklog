import type { LogEntryDeletion } from "@/types"

function isNewerLogEntryDeletion(existing: LogEntryDeletion, incoming: LogEntryDeletion): boolean {
  return new Date(incoming.createdAt).getTime() > new Date(existing.createdAt).getTime()
}

export function mergeLogEntryDeletions(
  ...logEntryDeletionGroups: LogEntryDeletion[][]
): LogEntryDeletion[] {
  const logEntryDeletionsByEntryId = new Map<string, LogEntryDeletion>()

  logEntryDeletionGroups.forEach((logEntryDeletions) => {
    logEntryDeletions.forEach((logEntryDeletion) => {
      const existing = logEntryDeletionsByEntryId.get(logEntryDeletion.logEntryId)

      if (!existing || isNewerLogEntryDeletion(existing, logEntryDeletion)) {
        logEntryDeletionsByEntryId.set(logEntryDeletion.logEntryId, logEntryDeletion)
      }
    })
  })

  return [...logEntryDeletionsByEntryId.values()]
}
