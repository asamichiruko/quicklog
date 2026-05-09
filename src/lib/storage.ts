import type { LogEntry, AppSettings } from "@/types"
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings"

const ITEMS_KEY = "quicklog.items"
const SETTINGS_KEY = "quicklog.settings"

export function loadItems(): LogEntry[] {
  const raw = localStorage.getItem(ITEMS_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveItems(items: LogEntry[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }

  try {
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
