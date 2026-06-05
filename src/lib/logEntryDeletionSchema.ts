import type { LogEntryDeletion } from "@/types"
import { SchemaValidationError } from "@/lib/errors"

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

function isValidIdString(value: string): boolean {
  return value.length > 0 && value.length <= 128
}

export function parseAsLogEntryDeletions(data: unknown): LogEntryDeletion[] {
  if (!Array.isArray(data)) {
    throw new SchemaValidationError("Top-level of data must be Array object.")
  }

  return data.map((item, index) => {
    if (!isValidLogEntryDeletion(item)) {
      throw new SchemaValidationError(`Cannot parse object as LogEntryDeletion at index ${index}.`, { index: index })
    }
    return item
  })
}

export function isValidLogEntryDeletion(obj: unknown): obj is LogEntryDeletion {
  if (typeof obj !== "object" || obj === null) {
    return false
  }

  if (!("id" in obj) || typeof obj.id !== "string" || !isValidIdString(obj.id)) {
    return false
  }

  if (!("entryId" in obj) || typeof obj.entryId !== "string" || !isValidIdString(obj.entryId)) {
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
