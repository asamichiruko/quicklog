import type { SyncOperation } from "@/types"
import { SchemaValidationError } from "@/lib/errors"

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

function isValidIdString(value: string): boolean {
  return value.length > 0 && value.length < 128
}

export function parseAsSyncOperations(data: unknown): SyncOperation[] {
  if (!Array.isArray(data)) {
    throw new SchemaValidationError("Top-level of data must be Array object.")
  }

  return data.map((item, index) => {
    if (!isValidSyncOperation(item)) {
      throw new SchemaValidationError(`Cannot parse object as SyncOperation at index ${index}.`, { index: index })
    }
    return item
  })
}

export function isValidSyncOperation(obj: unknown): obj is SyncOperation {
  if (typeof obj !== "object" || obj === null) {
    return false
  }

  if (!("id" in obj) || typeof obj.id !== "string" || !isValidIdString(obj.id)) {
    return false
  }

  if (!("type" in obj) || typeof obj.type !== "string") {
    return false
  }

  if (
    !("createdAt" in obj) ||
    typeof obj.createdAt !== "string" ||
    !isValidDateString(obj.createdAt)
  ) {
    return false
  }

  if (obj.type === "delete") {
    if (!("entryId" in obj) || typeof obj.entryId !== "string" || !isValidIdString(obj.entryId)) {
      return false
    }
  } else {
    return false
  }

  return true
}
