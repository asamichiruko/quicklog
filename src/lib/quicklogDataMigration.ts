import type { LogEntry, QuicklogData } from "@/types";
import { parseAsLogEntries } from "@/lib/logEntrySchema";
import { SchemaValidationError } from "@/lib/errors";
import { parseAsSyncOperations } from "@/lib/syncOperationSchema";

const LATEST_VERSION = 2

type QuicklogDataV1 = {
  version: 1
  logEntries: LogEntry[]
}

type QuicklogDataV2 = QuicklogData

type KnownQuickLogData = QuicklogDataV1 | QuicklogDataV2

function isRecord(value: unknown): value is Record < string, unknown > {
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

  throw new SchemaValidationError("Invalid data type.")
}

function migrateToLatest(data: KnownQuickLogData): QuicklogData {
  if (data.version === 1) {
    return {
      version: LATEST_VERSION,
      logEntries: data.logEntries,
      syncOperations: [],
    }
  }

  return data
}

function parseAsQuicklogDataV1(data: unknown): QuicklogDataV1 {
  return {
    version: 1,
    logEntries: parseAsLogEntries(data)
  }
}

function parseAsQuicklogDataV2(data: Record<string, unknown>): QuicklogDataV2 {
  return {
    version: 2,
    logEntries: parseAsLogEntries(data.logEntries),
    syncOperations: parseAsSyncOperations(data.syncOperations),
  }
}
