import { beforeEach, describe, expect, it } from "vitest"
import { loadLogEntries, saveLogEntries, loadSettings, saveSettings, loadQuicklogData, saveQuicklogData } from "./storage"
import { DEFAULT_SETTINGS } from "./settings"
import type { AppSettings, LogEntry, QuicklogData } from "@/types"
import { SchemaValidationError } from "@/lib/errors"

const QUICKLOG_DATA_KEY = "quicklog.data"
const LOG_ENTRIES_KEY = "quicklog.items"
const SETTINGS_KEY = "quicklog.settings"

describe("quicklogData", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("正常な quicklogData を読み書きできる", () => {
    const data = {
      version: 3,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }
      ],
      logEntryDeletions: [
        { createdAt: "2026-05-22T00:00:00.000Z", logEntryId: "id2" }
      ],
    } satisfies QuicklogData

    saveQuicklogData(data)
    expect(loadQuicklogData()).toEqual(data)
  })

  it("invalid な quicklogData を保存しようとすると例外を出す", () => {
    const invalidData = { name: "invalid data" } as unknown as QuicklogData

    expect(() => saveQuicklogData(invalidData)).toThrow(SchemaValidationError)
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })

  it("不正な quicklogData を保存しようとしたとき、既存の quicklogData を上書きしない", () => {
    const existing = {
      version: 3,
      logEntries: [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }],
      logEntryDeletions: [],
    } satisfies QuicklogData
    const invalidData = [{ name: "invalid data" }] as unknown as QuicklogData

    saveQuicklogData(existing)

    expect(() => saveQuicklogData(invalidData)).toThrow(SchemaValidationError)
    expect(loadQuicklogData()).toEqual(existing)
  })

  it("QUICKLOG_DATA_KEY に旧形式のデータが書き込まれているとき、データをマイグレーションして返す", () => {
    const data = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    localStorage.setItem(QUICKLOG_DATA_KEY, JSON.stringify(data))
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: data,
      logEntryDeletions: [],
    })
  })

  it("QUICKLOG_DATA_KEY に未対応のデータが書き込まれているとき、空の quicklogData を返す", () => {
    const data = {
      version: 4,
      logEntries: [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }],
      logEntryDeletions: [],
    }

    localStorage.setItem(QUICKLOG_DATA_KEY, JSON.stringify(data))
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })

  it("localStorage の内容が invalid JSON のとき、空の quicklogData を返す", () => {
    localStorage.setItem(QUICKLOG_DATA_KEY, "invalid json")
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })

  it("localStorage の内容が空のとき、空の quicklogData を返す", () => {
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })

  it("QUICKLOG_DATA_KEY が空で LOG_ENTRIES_KEY に valid な logEntries が保存されているとき、データをマイグレーションして返す", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }
    ]

    saveLogEntries(logEntries)

    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries,
      logEntryDeletions: [],
    })
  })

  it("QUICKLOG_DATA_KEY, LOG_ENTRIES_KEY の両方にデータが保存されているとき、QUICKLOG_DATA_KEY のデータを優先して読み込む", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }
    ]
    const quicklogData = {
      version: 3,
      logEntries: [
        { id: "id2", text: "text2", createdAt: "2026-05-22T00:00:00.000Z" }
      ],
      logEntryDeletions: [],
    } satisfies QuicklogData

    saveLogEntries(logEntries)
    saveQuicklogData(quicklogData)

    expect(loadQuicklogData()).toEqual(quicklogData)
  })

  it("QUICKLOG_DATA_KEY に invalid な data が、LOG_ENTRIES_KEY に valid なデータが保存されているとき、空の quicklogData を返す", () => {
    const data = { name: "invalid data" }
    localStorage.setItem(QUICKLOG_DATA_KEY, JSON.stringify(data))
    saveLogEntries([
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
    ])

    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })

  it("QUICKLOG_DATA_KEY に空文字が、LOG_ENTRIES_KEY に valid なデータが保存されているとき、空の quicklogData を返す", () => {
    localStorage.setItem(QUICKLOG_DATA_KEY, "")
    saveLogEntries([
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
    ])

    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })
})

describe("logEntries", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("localStorage に logEntries を保存できる", () => {
    const logs = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
    ]

    saveLogEntries(logs)
    expect(loadLogEntries()).toEqual(logs)
  })

  it("不正な logEntries を保存しようとすると例外を出す", () => {
    const invalidLogEntries = [{ name: "invalid entry" }] as unknown as LogEntry[]

    expect(() => saveLogEntries(invalidLogEntries)).toThrow(SchemaValidationError)
    expect(loadLogEntries()).toEqual([])
  })

  it("不正な logEntries を保存しようとしたとき、既存の logEntries を上書きしない", () => {
    const existing = [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }]

    localStorage.setItem(LOG_ENTRIES_KEY, JSON.stringify(existing))
    const invalidLogEntries = [{ name: "invalid entry" }] as unknown as LogEntry[]

    expect(() => saveLogEntries(invalidLogEntries)).toThrow(SchemaValidationError)
    expect(loadLogEntries()).toEqual(existing)
  })

  it("localStorage の logEntries 配列内に不正な内容が含まれているとき、空の配列が返る", () => {
    const logs = [
      { name: "invalid entry" },
      { id: "id2", text: "valid entry", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    localStorage.setItem(LOG_ENTRIES_KEY, JSON.stringify(logs))
    expect(loadLogEntries()).toEqual([])
  })

  it("localStorage の内容が invalid JSON のとき、空の配列が返る", () => {
    localStorage.setItem(LOG_ENTRIES_KEY, "invalid json")
    expect(loadLogEntries()).toEqual([])
  })

  it("localStorage の内容が空のとき、空の配列が返る", () => {
    expect(loadLogEntries()).toEqual([])
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

  it("localStorage の内容が invalid JSON のとき、デフォルト設定が返る", () => {
    localStorage.setItem(SETTINGS_KEY, "invalid json")

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
