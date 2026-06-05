import type { LogEntry, AppSettings, QuicklogData } from "@/types"
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings"
import { parseAsLogEntries } from "@/lib/logEntrySchema"
import { getUtf8ByteLength, MAX_LOG_ENTRIES_STORAGE_BYTES, MAX_QUICKLOG_DATA_STORAGE_BYTES, MAX_SETTINGS_STORAGE_BYTES } from "@/lib/sizeLimits"
import { SizeError } from "@/lib/errors"
import { parseAsQuicklogData } from "@/lib/quicklogDataMigration"

const QUICKLOG_DATA_KEY = "quicklog.data"
const LEGACY_LOG_ENTRIES_KEY = "quicklog.items"
const SETTINGS_KEY = "quicklog.settings"

export function loadQuicklogData(): QuicklogData {
  const raw = localStorage.getItem(QUICKLOG_DATA_KEY)
  if (raw === null) {
    const logEntries = loadLogEntries()
    return parseAsQuicklogData(logEntries)
  }

  const empty = {
    version: 3,
    logEntries: [],
    logEntryDeletions: [],
  } satisfies QuicklogData

  if (getUtf8ByteLength(raw) > MAX_QUICKLOG_DATA_STORAGE_BYTES) {
    return empty
  }

  try {
    return parseAsQuicklogData(JSON.parse(raw))
  } catch {
    return empty
  }
}

export function saveQuicklogData(quicklogData: QuicklogData) {
  const normalized = parseAsQuicklogData(quicklogData)
  const serialized = JSON.stringify(normalized)

  if (getUtf8ByteLength(serialized) > MAX_QUICKLOG_DATA_STORAGE_BYTES) {
    throw new SizeError("Quicklog data is too large.", {
      target: "storage",
      limitBytes: MAX_QUICKLOG_DATA_STORAGE_BYTES,
      actualBytes: getUtf8ByteLength(serialized)
    })
  }

  localStorage.setItem(QUICKLOG_DATA_KEY, serialized)
}

export function loadLogEntries(): LogEntry[] {
  const raw = localStorage.getItem(LEGACY_LOG_ENTRIES_KEY)
  if (!raw) return []

  if (getUtf8ByteLength(raw) > MAX_LOG_ENTRIES_STORAGE_BYTES) return []

  try {
    return parseAsLogEntries(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveLogEntries(logEntries: LogEntry[]) {
  const normalized = parseAsLogEntries(logEntries)
  const serialized = JSON.stringify(normalized)

  if (getUtf8ByteLength(serialized) > MAX_LOG_ENTRIES_STORAGE_BYTES) {
    throw new SizeError("Log entries are too large.", {
      target: "storage",
      limitBytes: MAX_LOG_ENTRIES_STORAGE_BYTES,
      actualBytes: getUtf8ByteLength(serialized)
    })
  }

  localStorage.setItem(LEGACY_LOG_ENTRIES_KEY, serialized)
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }

  if (getUtf8ByteLength(raw) > MAX_SETTINGS_STORAGE_BYTES) return { ...DEFAULT_SETTINGS }

  try {
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings)
  const serialized = JSON.stringify(normalized)

  if (getUtf8ByteLength(serialized) > MAX_SETTINGS_STORAGE_BYTES) {
    throw new SizeError("Settings are too large.", {
      target: "storage",
      limitBytes: MAX_SETTINGS_STORAGE_BYTES,
      actualBytes: getUtf8ByteLength(serialized),
     })
  }

  localStorage.setItem(SETTINGS_KEY, serialized)
}
