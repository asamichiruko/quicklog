import type { LogEntry, AppSettings } from "@/types"
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings"
import { parseAsLogEntries } from "@/lib/logEntrySchema"
import { getUtf8ByteLength, MAX_LOG_ENTRIES_STORAGE_BYTES, MAX_SETTINGS_STORAGE_BYTES } from "@/lib/sizeLimits"

const LOG_ENTRIES_KEY = "quicklog.items"
const SETTINGS_KEY = "quicklog.settings"

export function loadLogEntries(): LogEntry[] {
  const raw = localStorage.getItem(LOG_ENTRIES_KEY)
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
    throw new Error("Log entries are too large.")
  }

  localStorage.setItem(LOG_ENTRIES_KEY, serialized)
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
    throw new Error("Settings are too large.")
  }

  localStorage.setItem(SETTINGS_KEY, serialized)
}
