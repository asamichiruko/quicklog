import { describe, expect, it } from "vitest"
import { parseAsQuicklogData } from "./quicklogDataMigration"
import { SchemaValidationError } from "./errors"

describe("parseAsQuicklogData", () => {
  it("旧形式として LogEntry[] 型のデータを parse できる", () => {
    const logEntries = [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }]
    expect(parseAsQuicklogData(logEntries)).toEqual({
      version: 3,
      logEntries,
      logEntryDeletions: [],
    })
  })

  it("version 2 のデータを latest version に migrate できる", () => {
    const dataV2 = {
      version: 2,
      logEntries: [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }],
      syncOperations: [
        { id: "id1", type: "delete", createdAt: "2026-05-22T00:00:00.000Z", entryId: "id1" },
      ],
    }
    expect(parseAsQuicklogData(dataV2)).toEqual({
      version: 3,
      logEntries: dataV2.logEntries,
      logEntryDeletions: [{ createdAt: "2026-05-22T00:00:00.000Z", logEntryId: "id1" }],
    })
  })

  it("version 3 のデータを parse できる", () => {
    const dataV3 = {
      version: 3,
      logEntries: [{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }],
      logEntryDeletions: [{ createdAt: "2026-05-22T00:00:00.000Z", logEntryId: "id1" }],
    }
    expect(parseAsQuicklogData(dataV3)).toEqual(dataV3)
  })

  it("未対応または不正な型の version に対して例外を出す", () => {
    expect(() => {
      parseAsQuicklogData({ version: 4, logEntries: [], logEntryDeletions: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: "3", logEntries: [], logEntryDeletions: [] })
    }).toThrow(SchemaValidationError)
  })

  it("LogEntry[] 以外の version 1 風オブジェクトに対して例外を出す", () => {
    expect(() => {
      parseAsQuicklogData({ version: 1, logEntries: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData([
        {
          name: "invalid data",
        },
      ])
    }).toThrow(SchemaValidationError)
  })

  it("version 2 として不正なオブジェクトであるとき例外を出す", () => {
    expect(() => {
      parseAsQuicklogData({ version: 2, logEntries: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: 2, syncOperations: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: 2, logEntries: "invalid type", syncOperations: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: 2, logEntries: [], syncOperations: "invalid type" })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({
        version: 2,
        logEntries: [{ name: "invalid value" }],
        syncOperations: [],
      })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({
        version: 2,
        logEntries: [],
        syncOperations: [{ name: "invalid value" }],
      })
    }).toThrow(SchemaValidationError)
  })

  it("version 3 として不正なオブジェクトであるとき例外を出す", () => {
    expect(() => {
      parseAsQuicklogData({ version: 3, logEntries: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: 3, logEntryDeletions: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: 3, logEntries: "invalid type", logEntryDeletions: [] })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ version: 3, logEntries: [], logEntryDeletions: "invalid type" })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({
        version: 3,
        logEntries: [{ name: "invalid value" }],
        logEntryDeletions: [],
      })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({
        version: 3,
        logEntries: [],
        logEntryDeletions: [{ name: "invalid value" }],
      })
    }).toThrow(SchemaValidationError)
  })

  it("不正な値, object に対して例外を出す", () => {
    expect(() => {
      parseAsQuicklogData(undefined)
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData(null)
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData("{ version: 3, logEntries: [], logEntryDeletions: [] }")
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({ name: "invalid object" })
    }).toThrow(SchemaValidationError)
  })

  it("空の配列を version 1 と解釈して parse する", () => {
    expect(parseAsQuicklogData([])).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
  })
})
