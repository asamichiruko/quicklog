import type { LogEntry } from "@/types"
import { getLocalDateKey, startOfLocalDay } from "@/lib/date"

export type DateGroup = {
  key: string
  date: Date
  logEntries: LogEntry[]
}

export function groupLogEntriesByDate(logEntries: LogEntry[]): DateGroup[] {
  const groups = new Map<string, DateGroup>()

  logEntries.forEach((logEntry) => {
    const date = new Date(logEntry.createdAt)
    const key = getLocalDateKey(date)
    const group = groups.get(key)

    if (group) {
      group.logEntries.push(logEntry)
      return
    }

    groups.set(key, {
      key,
      date: startOfLocalDay(date),
      logEntries: [logEntry],
    })
  })

  return [...groups.values()]
}

export function sortLogEntriesByCreatedAtDesc(logEntries: LogEntry[]): LogEntry[] {
  return logEntries.toSorted(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

export function sortLogEntriesByCreatedAtAsc(logEntries: LogEntry[]): LogEntry[] {
  return logEntries.toSorted(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}

export function mergeLogEntries(existing: LogEntry[], incoming: LogEntry[]) {
  const seen = new Set(existing.map((item) => item.id))
  const merged = [...existing]

  incoming.forEach((entry) => {
    if (seen.has(entry.id)) return
    merged.push(entry)
    seen.add(entry.id)
  })

  return sortLogEntriesByCreatedAtAsc(merged)
}
