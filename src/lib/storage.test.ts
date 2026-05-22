import { beforeEach, describe, expect, it } from "vitest"
import { loadLogEntries, saveLogEntries, loadSettings, saveSettings } from "./storage"

describe("logEntries", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("localStorage に logEntry[] を保存できる", () => {
    const logs = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
    ]

    saveLogEntries(logs)
    expect(loadLogEntries()).toEqual(logs)
  })
})

describe("settings", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("localStorage に AppSettings を保存できる", () => {
    const settings = {
      showDailySummary: true,
    }

    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })
})
