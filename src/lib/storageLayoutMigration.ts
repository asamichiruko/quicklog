import type { QuicklogData } from "@/types"
import { DEFAULT_SETTINGS } from "@/lib/settings"

const LEGACY_QUICKLOG_DATA_KEY = "quicklog.data"
const LEGACY_LOG_ENTRIES_KEY = "quicklog.items"

export const ANONYMOUS_DATA_KEY = "quicklog.data.anonymous"
export const SETTINGS_KEY = "quicklog.settings"
export const STORED_DATA_SCOPE_KEY = "quicklog.storedDataScope"

const defaultQuicklogData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

export function getUserDataKey(userId: string) {
  return `quicklog.data.user.${userId}`
}

export function migrateStorageLayout() {
  const storedDataScope = localStorage.getItem(STORED_DATA_SCOPE_KEY)
  if (storedDataScope === null) {
    localStorage.setItem(STORED_DATA_SCOPE_KEY, JSON.stringify({ type: "anonymous" }))
  }

  const anonymousData = localStorage.getItem(ANONYMOUS_DATA_KEY)
  if (anonymousData === null) {
    migrateAnonymousDataFromV2()
  }

  const appSettings = localStorage.getItem(SETTINGS_KEY)
  if (appSettings === null) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
  }
}

function migrateAnonymousDataFromV2() {
  const legacyQuicklogData = localStorage.getItem(LEGACY_QUICKLOG_DATA_KEY)
  if (legacyQuicklogData === null) {
    migrateAnonymousDataFromV1()
  } else {
    localStorage.setItem(ANONYMOUS_DATA_KEY, legacyQuicklogData)
  }
}

function migrateAnonymousDataFromV1() {
  const legacyLogEntries = localStorage.getItem(LEGACY_LOG_ENTRIES_KEY)
  if (legacyLogEntries === null) {
    localStorage.setItem(ANONYMOUS_DATA_KEY, JSON.stringify(defaultQuicklogData))
  } else {
    localStorage.setItem(ANONYMOUS_DATA_KEY, legacyLogEntries)
  }
}
