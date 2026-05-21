import type { LogEntry } from "@/types"
import { sortLogEntriesByCreatedAtDesc } from "@/lib/logEntries"


export function parseAsLogEntries(data: unknown): LogEntry[] {
  if (!Array.isArray(data)) {
    throw new Error("データの最上位は配列である必要があります。")
  }

  return data.map((item, index) => {
    if (!isLogEntry(item)) {
      throw new Error(`${index + 1} 件目のデータをメモとして読み込めませんでした。`)
    }
    return item
  })
}

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

export function isLogEntry(item: object): item is LogEntry {
  if (typeof item !== "object" || item === null) {
    return false
  }

  if (!("id" in item) || typeof item.id !== "string") {
    return false
  }

  if (!("text" in item) || typeof item.text !== "string") {
    return false
  }

  if (
    !("createdAt" in item) ||
    typeof item.createdAt !== "string" ||
    !isValidDateString(item.createdAt)
  ) {
    return false
  }

  return true
}

export function mergeLogEntries(existing: LogEntry[], incoming: LogEntry[]) {
  const seen = new Set(existing.map((item) => item.id))
  const merged = [...existing]

  for (const entry of incoming) {
    if (seen.has(entry.id)) continue
    merged.push(entry)
    seen.add(entry.id)
  }

  return sortLogEntriesByCreatedAtDesc(merged)
}
