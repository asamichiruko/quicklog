import type { LogEntry } from "@/types"
import { getUtf8ByteLength, MAX_LOG_ENTRY_TEXT_BYTES } from "@/lib/sizeLimits"

export function parseAsLogEntries(data: unknown): LogEntry[] {
  if (!Array.isArray(data)) {
    throw new Error("データの最上位は配列である必要があります。")
  }

  return data.map((item, index) => {
    if (!isValidLogEntry(item)) {
      throw new Error(`${index + 1} 件目のデータをメモとして読み込めませんでした。`)
    }
    return item
  })
}

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

export function isValidLogEntry(item: unknown): item is LogEntry {
  if (typeof item !== "object" || item === null) {
    return false
  }

  if (!("id" in item) || typeof item.id !== "string") {
    return false
  }

  if (!("text" in item) || typeof item.text !== "string" || !isValidLogEntryText(item.text)) {
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

export function isValidLogEntryText(text: string) {
  return getUtf8ByteLength(text) <= MAX_LOG_ENTRY_TEXT_BYTES && text.trim().length > 0
}
