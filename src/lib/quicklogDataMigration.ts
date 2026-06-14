import type { LogEntry, QuicklogData } from "@/types"
import { mergeLogEntryDeletions } from "@/lib/logEntryDeletionCollection"
import { parseAsLogEntries } from "@/lib/logEntrySchema"
import { SchemaValidationError } from "@/errors"
import { parseAsLogEntryDeletions } from "@/lib/logEntryDeletionSchema"

const LATEST_VERSION = 3

type QuicklogDataV1 = {
  version: 1
  logEntries: LogEntry[]
}

type QuicklogDataV2Deletion = {
  id: string
  type: "delete"
  entryId: string
  createdAt: string
}

type QuicklogDataV2 = {
  version: 2
  logEntries: LogEntry[]
  syncOperations: QuicklogDataV2Deletion[]
}

type QuicklogDataV3 = QuicklogData

type KnownQuickLogData = QuicklogDataV1 | QuicklogDataV2 | QuicklogDataV3

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseAsQuicklogData(data: unknown): QuicklogData {
  return migrateToLatest(parseAsKnownQuicklogData(data))
}

function parseAsKnownQuicklogData(data: unknown): KnownQuickLogData {
  if (Array.isArray(data)) {
    return parseAsQuicklogDataV1(data)
  }

  if (isRecord(data) && data.version === 2) {
    return parseAsQuicklogDataV2(data)
  }

  if (isRecord(data) && data.version === 3) {
    return parseAsQuicklogDataV3(data)
  }

  throw new SchemaValidationError("Invalid data type.")
}

function migrateToLatest(data: KnownQuickLogData): QuicklogData {
  if (data.version === 1) {
    return {
      version: LATEST_VERSION,
      logEntries: data.logEntries,
      logEntryDeletions: [],
    }
  }

  if (data.version === 2) {
    return {
      version: LATEST_VERSION,
      logEntries: data.logEntries,
      logEntryDeletions: mergeLogEntryDeletions(
        data.syncOperations.map(({ entryId, createdAt }) => ({
          logEntryId: entryId,
          createdAt,
        })),
      ),
    }
  }

  return data
}

function parseAsQuicklogDataV1(data: unknown): QuicklogDataV1 {
  return {
    version: 1,
    logEntries: parseAsLogEntries(data),
  }
}

function parseAsQuicklogDataV2(data: Record<string, unknown>): QuicklogDataV2 {
  return {
    version: 2,
    logEntries: parseAsLogEntries(data.logEntries),
    syncOperations: parseAsQuicklogDataV2Deletions(data.syncOperations),
  }
}

function parseAsQuicklogDataV3(data: Record<string, unknown>): QuicklogDataV3 {
  return {
    version: 3,
    logEntries: parseAsLogEntries(data.logEntries),
    logEntryDeletions: mergeLogEntryDeletions(parseAsLogEntryDeletions(data.logEntryDeletions)),
  }
}

function parseAsQuicklogDataV2Deletions(data: unknown): QuicklogDataV2Deletion[] {
  if (!Array.isArray(data)) {
    throw new SchemaValidationError("Top-level of data must be Array object.")
  }

  return data.map((item, index) => {
    if (!isValidQuicklogDataV2Deletion(item)) {
      throw new SchemaValidationError(
        `Cannot parse object as QuicklogDataV2Deletion at index ${index}.`,
        { index: index },
      )
    }
    return item
  })
}

function isValidQuicklogDataV2Deletion(obj: unknown): obj is QuicklogDataV2Deletion {
  if (typeof obj !== "object" || obj === null) {
    return false
  }

  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    obj.id.length > 0 &&
    obj.id.length <= 128 &&
    "type" in obj &&
    obj.type === "delete" &&
    "entryId" in obj &&
    typeof obj.entryId === "string" &&
    obj.entryId.length > 0 &&
    obj.entryId.length <= 128 &&
    "createdAt" in obj &&
    typeof obj.createdAt === "string" &&
    !Number.isNaN(Date.parse(obj.createdAt))
  )
}
