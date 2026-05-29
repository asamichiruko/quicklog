import type { LogEntry } from "@/types"
import { getUtf8ByteLength, MAX_LOG_ENTRY_TEXT_BYTES } from "@/lib/sizeLimits"
import { SchemaValidationError } from "@/lib/error"

export function parseAsLogEntries(data: unknown): LogEntry[] {
  if (!Array.isArray(data)) {
    throw new SchemaValidationError("Top-level of data must be Array object.")
  }

  return data.map((item, index) => {
    if (!isValidLogEntry(item)) {
      throw new SchemaValidationError(`Cannot parse object as LogEntry at index ${index}.`, { index: index })
    }
    return item
  })
}

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

export function isValidLogEntry(obj: unknown): obj is LogEntry {
  if (typeof obj !== "object" || obj === null) {
    return false
  }

  if (!("id" in obj) || typeof obj.id !== "string" || obj.id.length == 0 || obj.id.length > 128) {
    return false
  }

  if (!("text" in obj) || typeof obj.text !== "string" || !isValidLogEntryText(obj.text)) {
    return false
  }

  if (
    !("createdAt" in obj) ||
    typeof obj.createdAt !== "string" ||
    !isValidDateString(obj.createdAt)
  ) {
    return false
  }

  return true
}

export function isValidLogEntryText(text: string) {
  return getUtf8ByteLength(text) <= MAX_LOG_ENTRY_TEXT_BYTES && text.trim().length > 0
}
