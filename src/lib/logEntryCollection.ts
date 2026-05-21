import type { LogEntry } from "@/types"
import { getLocalDateKey, startOfLocalDay } from "@/lib/date"

export type DateGroup = {
  key: string
  date: Date
  items: LogEntry[]
}

export function groupLogEntriesByDate(items: LogEntry[]): DateGroup[] {
  const groups = new Map<string, DateGroup>()

  for (const item of items) {
    const date = new Date(item.createdAt)
    const key = getLocalDateKey(date)
    const group = groups.get(key)

    if (group) {
      group.items.push(item)
      continue
    }

    groups.set(key, {
      key,
      date: startOfLocalDay(date),
      items: [item],
    })
  }

  return [...groups.values()]
}

export function sortLogEntriesByCreatedAtDesc(items: LogEntry[]): LogEntry[] {
  return items.toSorted(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

export function sortLogEntriesByCreatedAtAsc(items: LogEntry[]): LogEntry[] {
  return items.toSorted(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}

export function mergeLogEntries(existing: LogEntry[], incoming: LogEntry[]) {
  const seen = new Set(existing.map((item) => item.id))
  const merged = [...existing]

  for (const entry of incoming) {
    if (seen.has(entry.id)) continue
    merged.push(entry)
    seen.add(entry.id)
  }

  return sortLogEntriesByCreatedAtAsc(merged)
}
