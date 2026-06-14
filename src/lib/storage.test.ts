import { beforeEach, describe, expect, it } from "vitest"
import {
  loadSettings,
  saveSettings,
  loadQuicklogData,
  saveQuicklogData,
  saveStoredDataScope,
  loadStoredDataScope,
} from "./storage"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { AppSettings, DataScope, QuicklogData } from "@/types"
import { SchemaValidationError } from "@/errors"
import { STORED_DATA_SCOPE_KEY } from "./storageLayoutMigration"

describe("storedDataScope", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("正常な storedDataScope を読み書きできる", () => {
    const dataScope = { type: "user", userId: "user1" } satisfies DataScope

    saveStoredDataScope(dataScope)
    expect(loadStoredDataScope()).toEqual(dataScope)
  })

  it("不正値を save しようとすると例外を出す", () => {
    const invalidObject = { name: "invalid dataScope" } as unknown as DataScope

    expect(() => saveStoredDataScope(invalidObject)).toThrow(SchemaValidationError)
  })

  it("不正な値を load しようとしたときデフォルト値を返す", () => {
    localStorage.setItem(STORED_DATA_SCOPE_KEY, JSON.stringify({ name: "invalid dataScope" }))

    expect(loadStoredDataScope()).toEqual({ type: "anonymous" })
  })

  it("localStorage が空のときデフォルト値を返す", () => {
    expect(loadStoredDataScope()).toEqual({ type: "anonymous" })
  })
})

describe("quicklogData", () => {
  const quicklogData1 = {
    version: 3,
    logEntries: [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }],
    logEntryDeletions: [{ createdAt: "2026-05-22T00:00:00.000Z", logEntryId: "id2" }],
  } satisfies QuicklogData

  const quicklogData2 = {
    version: 3,
    logEntries: [{ id: "id2", text: "text2", createdAt: "2026-05-22T00:00:00.000Z" }],
    logEntryDeletions: [{ createdAt: "2026-05-22T00:00:00.000Z", logEntryId: "id3" }],
  } satisfies QuicklogData

  beforeEach(() => {
    localStorage.clear()
  })

  it("anonymous の quicklogData を読み書きできる", () => {
    saveQuicklogData(quicklogData1)
    expect(loadQuicklogData()).toEqual(quicklogData1)
  })

  it("存在する user の quicklogData を読み書きできる", () => {
    saveQuicklogData(quicklogData1, "user1")
    expect(loadQuicklogData("user1")).toEqual(quicklogData1)
  })

  it("異なる userId の user 同士のデータを干渉せず読み書きできる", () => {
    saveQuicklogData(quicklogData1, "user1")
    saveQuicklogData(quicklogData2, "user2")
    expect(loadQuicklogData("user1")).toEqual(quicklogData1)
    expect(loadQuicklogData("user2")).toEqual(quicklogData2)
  })

  it("invalid な quicklogData を保存しようとすると例外を出す", () => {
    const invalidData = { name: "invalid data" } as unknown as QuicklogData

    expect(() => saveQuicklogData(invalidData)).toThrow(SchemaValidationError)
  })

  it("不正な quicklogData を保存しようとしたとき、既存の quicklogData を上書きしない", () => {
    const invalidData = [{ name: "invalid data" }] as unknown as QuicklogData

    saveQuicklogData(quicklogData1)

    expect(() => saveQuicklogData(invalidData)).toThrow(SchemaValidationError)
    expect(loadQuicklogData()).toEqual(quicklogData1)
  })

  it("localStorage の内容が空のとき、空の quicklogData を返す", () => {
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })
})

describe("settings", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("localStorage に AppSettings を保存できる", () => {
    const settings = { ...DEFAULT_SETTINGS, showDailySummary: true }

    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it("不正な settings は normalize して保存する", () => {
    const invalidSettings = { showDailySummary: "yes" } as unknown as AppSettings

    saveSettings(invalidSettings)

    const settings = loadSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SETTINGS)
  })

  it("localStorage が空のとき、デフォルト設定が返る", () => {
    const settings = loadSettings()

    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SETTINGS)
  })
})
