import { beforeEach, describe, expect, it } from "vitest"
import { loadLogEntries, saveLogEntries, loadSettings, saveSettings } from "./storage"
import { DEFAULT_SETTINGS } from "./settings"
import type { AppSettings, LogEntry } from "@/types"

const LOG_ENTRIES_KEY = "quicklog.items"
const SETTINGS_KEY = "quicklog.settings"

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

    expect(() => saveLogEntries(invalidLogEntries)).toThrow()
    expect(loadLogEntries()).toEqual([])
  })

  it("不正な logEntries を保存しようとしたとき、既存の logEntries を上書きしない", () => {
    const existing = [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }]

    localStorage.setItem(LOG_ENTRIES_KEY, JSON.stringify(existing))
    const invalidLogEntries = [{ name: "invalid entry" }] as unknown as LogEntry[]

    expect(() => saveLogEntries(invalidLogEntries)).toThrow()
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

  it("localStorage から読み込んだデータのサイズが大きすぎるとき、空の配列が返る", () => {
    const logs = [
      {id: "id1", text: "a".repeat(20 * 1024 * 1024), createdAt: "2026-05-22T00:00:00.000Z"}
    ]
    localStorage.setItem(LOG_ENTRIES_KEY, JSON.stringify(logs))
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

  it("localStorage から読み込んだデータのサイズが大きすぎるとき、デフォルト設定が返る", () => {
    const settings = { ...DEFAULT_SETTINGS, dummyProp: "a".repeat(20 * 1024 * 1024) }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SETTINGS)
  })

  it("localStorage が空のとき、デフォルト設定が返る", () => {
    const settings = loadSettings()

    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SETTINGS)
  })
})
