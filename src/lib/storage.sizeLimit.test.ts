import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.doUnmock("@/lib/sizeLimits")
  vi.resetModules()
})

describe("quicklogData size limit", () => {
  afterEach(() => {
    localStorage.clear()
    vi.doUnmock("@/lib/sizeLimits")
    vi.resetModules()
  })

  it("サイズ上限を超えるデータを保存しようとすると例外を出す", async () => {
    vi.resetModules()

    vi.doMock("@/lib/sizeLimits", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/sizeLimits")>()

      return {
        ...actual,
        MAX_QUICKLOG_DATA_STORAGE_BYTES: 160,
      }
    })

    const { loadQuicklogData, saveQuicklogData } = await import("./storage")
    const { SizeError } = await import("@/lib/errors")

    const existing = {
      version: 3 as const,
      logEntries: [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }],
      logEntryDeletions: [],
    }
    const tooLargeData = {
      version: 3 as const,
      logEntries: [{ id: "id1", text: "a".repeat(200), createdAt: "2026-05-22T00:00:00.000Z" }],
      logEntryDeletions: [],
    }

    saveQuicklogData(existing)
    expect(() => saveQuicklogData(tooLargeData)).toThrow(SizeError)
    expect(() => saveQuicklogData(tooLargeData, "user1")).toThrow(SizeError)
    expect(loadQuicklogData()).toEqual(existing)
  })

  it("localStorage から読み込んだデータのサイズが大きすぎるとき、空の quicklogData を返す", async () => {
    vi.resetModules()
    vi.doMock("@/lib/sizeLimits", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/sizeLimits")>()

      return {
        ...actual,
        MAX_QUICKLOG_DATA_STORAGE_BYTES: 160,
      }
    })

    const { loadQuicklogData } = await import("./storage")
    const { ANONYMOUS_DATA_KEY } = await import("@/lib/storageLayoutMigration.ts")

    const tooLargeData = {
      version: 3,
      logEntries: [{ id: "id1", text: "a".repeat(200), createdAt: "2026-05-22T00:00:00.000Z" }],
      logEntryDeletions: [],
    }

    localStorage.setItem(ANONYMOUS_DATA_KEY, JSON.stringify(tooLargeData))
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })
})

describe("settings size limit", () => {
  it("サイズ上限を超えるデータを保存しようとすると例外を出す", async () => {
    vi.resetModules()

    vi.doMock("@/lib/sizeLimits", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/sizeLimits")>()

      return {
        ...actual,
        MAX_SETTINGS_STORAGE_BYTES: 20,
      }
    })

    const { saveSettings } = await import("./storage")
    const { DEFAULT_SETTINGS } = await import("@/lib/settings")
    const { SizeError } = await import("@/lib/errors")
    const { SETTINGS_KEY } = await import("@/lib/storageLayoutMigration.ts")

    const existing = {
      ...DEFAULT_SETTINGS,
      showDailySummary: true,
    }
    const tooLargeData = {
      ...DEFAULT_SETTINGS,
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(existing))
    expect(() => {
      saveSettings(tooLargeData)
    }).toThrow(SizeError)
    const raw = localStorage.getItem(SETTINGS_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual(existing)
  })

  it("localStorage から読み込んだデータのサイズが大きすぎるとき、デフォルト設定を返す", async () => {
    vi.resetModules()

    vi.doMock("@/lib/sizeLimits", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/sizeLimits")>()

      return {
        ...actual,
        MAX_SETTINGS_STORAGE_BYTES: 160,
      }
    })

    const { loadSettings } = await import("./storage")
    const { DEFAULT_SETTINGS } = await import("@/lib/settings")
    const { SETTINGS_KEY } = await import("@/lib/storageLayoutMigration.ts")

    const tooLargeData = {
      ...DEFAULT_SETTINGS,
      dummyProp: "a".repeat(200),
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(tooLargeData))
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
