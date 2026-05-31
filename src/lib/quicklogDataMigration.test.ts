import { describe, expect, it } from "vitest";
import { parseAsQuicklogData } from "./quicklogDataMigration";
import { SchemaValidationError } from "./errors";

describe("parseAsQuicklogData", () => {
  it("旧形式として LogEntry[] 型のデータを parse できる", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
    ]
    expect(parseAsQuicklogData(logEntries)).toEqual({
      version: 2,
      logEntries,
      syncOperations: [],
    })
  })

  it("version 2 のデータを parse できる", () => {
    const dataV2 = {
      version: 2,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      ],
      syncOperations: [
        { id: "id1", type: "delete", createdAt: "2026-05-22T00:00:00.000Z", entryId: "id1" },
      ],
    }
    expect(parseAsQuicklogData(dataV2)).toEqual(dataV2)
  })

  it("未対応または不正な型の version に対して例外を出す", () => {
    expect(() => { parseAsQuicklogData({ version: 3, logEntries: [], syncOperations: [] }) }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData({ version: "2", logEntries: [], syncOperations: [] }) }).toThrow(SchemaValidationError)
  })

  it("LogEntry[] 以外の version 1 風オブジェクトに対して例外を出す", () => {
    expect(() => { parseAsQuicklogData({ version: 1, logEntries: [] }) }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData([
        {
          name: "invalid data"
        },
    ]) }).toThrow(SchemaValidationError)
  })

  it("version 2 として不正なオブジェクトであるとき例外を出す", () => {
    expect(() => { parseAsQuicklogData({ version: 2, logEntries: [] }) }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData({ version: 2, syncOperations: [] }) }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData({ version: 2, logEntries: "invalid type", syncOperations: [] }) }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData({ version: 2, logEntries: [], syncOperations: "invalid type" }) }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({
        version: 2, logEntries: [{ name: "invalid value" }], syncOperations: []
      })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsQuicklogData({
        version: 2, logEntries: [], syncOperations: [{ name: "invalid value" }]
      })
    }).toThrow(SchemaValidationError)
  })

  it("不正な値, object に対して例外を出す", () => {
    expect(() => { parseAsQuicklogData(undefined) }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData(null) }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData("{ version: 2, logEntries: [], syncOperations: [] }") }).toThrow(SchemaValidationError)
    expect(() => { parseAsQuicklogData({ name: "invalid object" }) }).toThrow(SchemaValidationError)
  })

  it("空の配列を version 1 と解釈して parse する", () => {
    expect(parseAsQuicklogData([])).toEqual({
      version: 2,
      logEntries: [],
      syncOperations: [],
    })
  })
})
