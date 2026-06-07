import type { DataScope } from "@/types"
import { SchemaValidationError } from "@/lib/errors"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidUserId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128
}

export function parseAsDataScope(dataScope: unknown): DataScope {
  if (!isRecord(dataScope)) {
    throw new SchemaValidationError("DataScope must be object.")
  }

  if (dataScope.type === "anonymous") {
    return { type: dataScope.type }
  }
  if (dataScope.type === "user") {
    if (!isValidUserId(dataScope.userId)) {
      throw new SchemaValidationError(`DataScope "${dataScope.type}" must have a property "userId".`)
    }
    return { type: dataScope.type, userId: dataScope.userId }
  }

  throw new SchemaValidationError("Invalid DataScope type.")
}
