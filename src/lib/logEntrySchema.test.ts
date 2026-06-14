import { describe, expect, it } from "vitest"
import { isValidLogEntry, isValidLogEntryText, parseAsLogEntries } from "./logEntrySchema"
import { SchemaValidationError } from "@/errors"

describe("isValidLogEntry", () => {
  it("valid な LogEntry を true と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry(item)).toBe(true)
  })

  it("null を false と判定する", () => {
    expect(isValidLogEntry(null)).toBe(false)
  })

  it("object でないものを false と判定する", () => {
    expect(isValidLogEntry("invalid item")).toBe(false)
  })

  it("id が string でないとき false と判定する", () => {
    const item = {
      id: 42,
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("text が string でないとき false と判定する", () => {
    const item = {
      id: "id1",
      text: 42,
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("text が invalid であるとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("createdAt が string でないとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: new Date("2026-05-22T00:00:00.000Z"),
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("createdAt が invalid な date string であるとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "invalid date string",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("配列を false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry([item])).toBe(false)
  })

  it("id が存在しないとき false と判定する", () => {
    const item = {
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("text が存在しないとき false と判定する", () => {
    const item = {
      id: "id1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("createdAt が存在しないとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
    }

    expect(isValidLogEntry(item)).toBe(false)
  })

  it("object が余分なプロパティを持っているとき true と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
      newProperty: 42,
    }

    expect(isValidLogEntry(item)).toBe(true)
  })
})

describe("parseAsLogEntries", () => {
  it("valid な LogEntry[] をそのまま返す", () => {
    const data = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-05-24T00:00:00.000Z", newProperty: 42 },
    ]

    const parsed = parseAsLogEntries(data)

    expect(parsed).toEqual(data)
  })

  it("配列でない object に対して例外を出す", () => {
    const data = { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }

    expect(() => {
      parseAsLogEntries(data)
    }).toThrow(SchemaValidationError)
  })

  it("invalid な LogEntry を含む data に対して例外を出す", () => {
    const data = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { name: "invalid data" },
    ]

    expect(() => {
      parseAsLogEntries(data)
    }).toThrow(SchemaValidationError)
  })

  it("空の配列をそのまま返す", () => {
    expect(parseAsLogEntries([])).toEqual([])
  })
})

describe("isValidLogEntryText", () => {
  it("valid な text に対して true を返す", () => {
    expect(isValidLogEntryText("valid\n  text  \n    multiline")).toBe(true)
  })

  it("空白文字のみからなる text に対して false を返す", () => {
    expect(isValidLogEntryText("  \n  \t  ")).toBe(false)
  })

  it("空文字列に対して false を返す", () => {
    expect(isValidLogEntryText("")).toBe(false)
  })

  it("異常に大きな text に対して false を返す", () => {
    const longText = "a".repeat(10 * 1024 * 1024)
    expect(isValidLogEntryText(longText)).toBe(false)
  })
})
