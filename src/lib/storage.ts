import type { AppSettings, QuicklogData, DataScope } from "@/types"
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings"
import {
  getUtf8ByteLength,
  MAX_QUICKLOG_DATA_STORAGE_BYTES,
  MAX_SETTINGS_STORAGE_BYTES,
} from "@/lib/sizeLimits"
import { SizeError } from "@/errors"
import { parseAsQuicklogData } from "@/lib/quicklogDataMigration"
import {
  ANONYMOUS_DATA_KEY,
  getUserDataKey,
  SETTINGS_KEY,
  STORED_DATA_SCOPE_KEY,
} from "@/lib/storageLayoutMigration"
import { parseAsDataScope } from "@/lib/dataScopeSchema"

export function loadStoredDataScope(): DataScope {
  const raw = localStorage.getItem(STORED_DATA_SCOPE_KEY)
  const defaultValue = { type: "anonymous" } satisfies DataScope

  if (!raw) return defaultValue

  try {
    return parseAsDataScope(JSON.parse(raw))
  } catch {
    return defaultValue
  }
}

export function saveStoredDataScope(dataScope: DataScope) {
  const normalized = parseAsDataScope(dataScope)
  const serialized = JSON.stringify(normalized)

  localStorage.setItem(STORED_DATA_SCOPE_KEY, serialized)
}

export function loadQuicklogData(userId?: string): QuicklogData {
  let key = ANONYMOUS_DATA_KEY
  if (userId) key = getUserDataKey(userId)

  const raw = localStorage.getItem(key)

  const defaultValue = {
    version: 3,
    logEntries: [],
    logEntryDeletions: [],
  } satisfies QuicklogData

  if (!raw) {
    return defaultValue
  }

  if (getUtf8ByteLength(raw) > MAX_QUICKLOG_DATA_STORAGE_BYTES) {
    return defaultValue
  }

  try {
    return parseAsQuicklogData(JSON.parse(raw))
  } catch {
    return defaultValue
  }
}

export function saveQuicklogData(quicklogData: QuicklogData, userId?: string) {
  const normalized = parseAsQuicklogData(quicklogData)
  const serialized = JSON.stringify(normalized)

  if (getUtf8ByteLength(serialized) > MAX_QUICKLOG_DATA_STORAGE_BYTES) {
    throw new SizeError("Quicklog data is too large.", {
      target: "storage",
      limitBytes: MAX_QUICKLOG_DATA_STORAGE_BYTES,
      actualBytes: getUtf8ByteLength(serialized),
    })
  }

  let key = ANONYMOUS_DATA_KEY
  if (userId) key = getUserDataKey(userId)

  localStorage.setItem(key, serialized)
}

export function clearQuicklogData(userId?: string) {
  let key = ANONYMOUS_DATA_KEY
  if (userId) key = getUserDataKey(userId)

  localStorage.removeItem(key)
}

export function loadSettings(): AppSettings {
  const defaultValue = { ...DEFAULT_SETTINGS }
  const raw = localStorage.getItem(SETTINGS_KEY)

  if (!raw) return defaultValue

  if (getUtf8ByteLength(raw) > MAX_SETTINGS_STORAGE_BYTES) return defaultValue

  try {
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return defaultValue
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
