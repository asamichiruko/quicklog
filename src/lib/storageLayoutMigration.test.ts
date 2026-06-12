import { beforeEach, describe, expect, it } from "vitest"
import {
  ANONYMOUS_DATA_KEY,
  getUserDataKey,
  migrateStorageLayout,
  SETTINGS_KEY,
  STORED_DATA_SCOPE_KEY,
} from "./storageLayoutMigration"
import type { AppSettings, QuicklogData } from "@/types"
import { DEFAULT_SETTINGS } from "./settings"

const LEGACY_QUICKLOG_DATA_KEY = "quicklog.data"
const LEGACY_LOG_ENTRIES_KEY = "quicklog.items"

describe("migrateStorageLayout", () => {
  const anonymousQuicklogData = {
    version: 3,
    logEntries: [{ id: "id1", text: "anonymous1", createdAt: "2026-06-07T00:00:00.000Z" }],
    logEntryDeletions: [{ logEntryId: "id2", createdAt: "2026-06-07T00:00:00.000Z" }],
  } satisfies QuicklogData

  const settings = {
    ...DEFAULT_SETTINGS,
    showDailySummary: true,
  } satisfies AppSettings

  const userQuicklogData = {
    version: 3,
    logEntries: [{ id: "id1", text: "user1", createdAt: "2026-06-07T00:00:00.000Z" }],
    logEntryDeletions: [{ logEntryId: "id2", createdAt: "2026-06-07T00:00:00.000Z" }],
  } satisfies QuicklogData

  beforeEach(() => {
    localStorage.clear()
  })

  it("StoredDataScope が存在するときは既存の値を上書きしない", () => {
    const existing = JSON.stringify({ type: "user", userId: "user1" })
    localStorage.setItem(STORED_DATA_SCOPE_KEY, existing)

    migrateStorageLayout()

    expect(localStorage.getItem(STORED_DATA_SCOPE_KEY)).toBe(existing)
  })

  it("StoredDataScope が存在しないときはデフォルト値をセットする", () => {
    migrateStorageLayout()

    expect(localStorage.getItem(STORED_DATA_SCOPE_KEY)).toBe(JSON.stringify({ type: "anonymous" }))
  })

  it("AppSettings が存在するときは既存の値を上書きしない", () => {
    const existing = JSON.stringify(settings)
    localStorage.setItem(SETTINGS_KEY, existing)

    migrateStorageLayout()

    expect(localStorage.getItem(SETTINGS_KEY)).toBe(existing)
  })

  it("AppSettings が存在しないときはデフォルト値をセットする", () => {
    migrateStorageLayout()

    expect(localStorage.getItem(SETTINGS_KEY)).toBe(JSON.stringify(DEFAULT_SETTINGS))
  })

  it("anonymous の QuicklogData が存在するときは既存の値を上書きしない", () => {
    const existing = JSON.stringify(anonymousQuicklogData)
    localStorage.setItem(ANONYMOUS_DATA_KEY, existing)

    migrateStorageLayout()

    expect(localStorage.getItem(ANONYMOUS_DATA_KEY)).toBe(existing)
  })

  it("anonymous の QuicklogData が存在せず、legacy な QuicklogData が存在するときは、これを migrate する", () => {
    const existing = JSON.stringify(anonymousQuicklogData)
    localStorage.setItem(LEGACY_QUICKLOG_DATA_KEY, existing)

    migrateStorageLayout()

    expect(localStorage.getItem(ANONYMOUS_DATA_KEY)).toBe(existing)
  })

  it("anonymous の QuicklogData, legacy QuicklogData が存在せず、legacy LogEntries が存在するときは、これを migrate する", () => {
    const existing = JSON.stringify(anonymousQuicklogData.logEntries)
    localStorage.setItem(LEGACY_LOG_ENTRIES_KEY, existing)

    migrateStorageLayout()

    expect(localStorage.getItem(ANONYMOUS_DATA_KEY)).toBe(existing)
  })

  it("migrateStorageLayout を繰り返し実行しても値が変わらない", () => {
    const existingDataScope = JSON.stringify({ type: "authenticated", userId: "user1" })
    localStorage.setItem(STORED_DATA_SCOPE_KEY, existingDataScope)
    const existingAnonymousData = JSON.stringify(anonymousQuicklogData)
    localStorage.setItem(ANONYMOUS_DATA_KEY, existingAnonymousData)
    const userDataKey = getUserDataKey("user1")
    const existingUserData = JSON.stringify(userQuicklogData)
    localStorage.setItem(userDataKey, existingUserData)

    migrateStorageLayout()
    migrateStorageLayout()

    expect(localStorage.getItem(STORED_DATA_SCOPE_KEY)).toBe(existingDataScope)
    expect(localStorage.getItem(ANONYMOUS_DATA_KEY)).toBe(existingAnonymousData)
    expect(localStorage.getItem(userDataKey)).toBe(existingUserData)
  })
})
