import type { LogEntry } from "@/types"

export type DateGroup = {
  key: string
  date: Date
  items: LogEntry[]
}

export function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
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

export function formatRelativeDate(date: Date) {
  const today = startOfLocalDay(new Date())
  const target = startOfLocalDay(date)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return "今日"
  if (diffDays === -1) return "昨日"
  if (diffDays === 1) return "明日"
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`

  return `${diffDays}日後`
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
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
