import { describe, expect, it } from "vitest"
import { isValidLogEntryDeletion, parseAsLogEntryDeletions } from "./logEntryDeletionSchema"
import { SchemaValidationError } from "@/lib/errors"

describe("isValidLogEntryDeletion", () => {
  it("valid な LogEntryDeletion を true と判定する", () => {
    expect(
      isValidLogEntryDeletion({
        createdAt: "2026-05-31T00:00:00.000Z",
        logEntryId: "id1",
      }),
    ).toBe(true)
  })

  it("object 型でないものを false と判定する", () => {
    expect(isValidLogEntryDeletion(undefined)).toBe(false)
    expect(isValidLogEntryDeletion(null)).toBe(false)
    expect(isValidLogEntryDeletion([])).toBe(false)
    expect(isValidLogEntryDeletion("invalid item")).toBe(false)
  })

  it("entryId は 1 文字以上 128 文字以下を valid, それ以外を invalid と判定する", () => {
    const itemBase = {
      createdAt: "2026-05-31T00:00:00.000Z",
    }
    expect(isValidLogEntryDeletion({ ...itemBase, logEntryId: "" })).toBe(false)
    expect(isValidLogEntryDeletion({ ...itemBase, logEntryId: "a" })).toBe(true)
    expect(isValidLogEntryDeletion({ ...itemBase, logEntryId: "a".repeat(128) })).toBe(true)
    expect(isValidLogEntryDeletion({ ...itemBase, logEntryId: "a".repeat(129) })).toBe(false)
  })

  it("createdAt が存在しない、または invalid な date string であるとき false と判定する", () => {
    expect(
      isValidLogEntryDeletion({
        createdAt: "invalid date",
        logEntryId: "entryId1",
      }),
    ).toBe(false)

    expect(
      isValidLogEntryDeletion({
        createdAt: new Date("2026-05-31T00:00:00.000Z"),
        logEntryId: "entryId1",
      }),
    ).toBe(false)

    expect(
      isValidLogEntryDeletion({
        createdAt: "",
        logEntryId: "entryId1",
      }),
    ).toBe(false)

    expect(
      isValidLogEntryDeletion({
        logEntryId: "entryId1",
      }),
    ).toBe(false)
  })

  it("object が余分なプロパティを持っているとき true と判定する", () => {
    const item = {
      createdAt: "2026-05-31T00:00:00.000Z",
      logEntryId: "entryId1",
      unknownProperty: 42,
    }
    expect(isValidLogEntryDeletion(item)).toBe(true)
  })

  it("entryId が存在しない、または型が異なるとき false を返す", () => {
    expect(
      isValidLogEntryDeletion({
        createdAt: "2026-05-31T00:00:00.000Z",
        logEntryId: 42,
      }),
    ).toBe(false)

    expect(
      isValidLogEntryDeletion({
        createdAt: "2026-05-31T00:00:00.000Z",
      }),
    ).toBe(false)
  })
})

describe("parseAsLogEntryDeletions", () => {
  it("valid な LogEntryDeletion[] をそのまま返す", () => {
    const data = [
      {
        createdAt: "2026-05-31T00:00:00.000Z",
        logEntryId: "entryId1",
      },
    ]

    const parsed = parseAsLogEntryDeletions(data)
    expect(parsed).toEqual(data)
  })

  it("配列でない object に対して例外を出す", () => {
    expect(() => {
      parseAsLogEntryDeletions({ name: "invalid object" })
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsLogEntryDeletions(undefined)
    }).toThrow(SchemaValidationError)
    expect(() => {
      parseAsLogEntryDeletions(null)
    }).toThrow(SchemaValidationError)
  })

  it("invalid な LogEntryDeletion を含む配列に対して例外を出す", () => {
    expect(() => {
      parseAsLogEntryDeletions([{ name: "invalid data" }])
    }).toThrow(SchemaValidationError)
  })

  it("空の配列をそのまま返す", () => {
    expect(parseAsLogEntryDeletions([])).toEqual([])
  })
})
