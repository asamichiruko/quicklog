import { describe, expect, it } from "vitest"
import { isLogEntry, parseAsLogEntries } from "./logEntrySchema"

describe("isLogEntry", () => {
  it("valid な LogEntry を true と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isLogEntry(item)).toBe(true)
  })

  it("null を false と判定する", () => {
    expect(isLogEntry(null)).toBe(false)
  })

  it("object でないものを false と判定する", () => {
    expect(isLogEntry("invalid item")).toBe(false)
  })

  it("id が string でないとき false と判定する", () => {
    const item = {
      id: 42,
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z"
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("text が string でないとき false と判定する", () => {
    const item = {
      id: "id1",
      text: 42,
      createdAt: "2026-05-22T00:00:00.000Z"
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("createdAt が string でないとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: new Date("2026-05-22T00:00:00.000Z")
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("createdAt が invalid な date string であるとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "invalid date string"
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("配列を false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isLogEntry([item])).toBe(false)
  })

  it("id が存在しないとき false と判定する", () => {
    const item = {
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("text が存在しないとき false と判定する", () => {
    const item = {
      id: "id1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("createdAt が存在しないとき false と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
    }

    expect(isLogEntry(item)).toBe(false)
  })

  it("object が余分なプロパティを持っているとき true と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
      newProperty: 42,
    }

    expect(isLogEntry(item)).toBe(true)
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
    const data = { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z", }

    expect(() => { parseAsLogEntries(data) }).toThrow("データの最上位は配列である必要があります。")
  })

  it("invalid な LogEntry を含む data に対して例外を出す", () => {
    const data = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z", },
      { name: "invalid data" },
    ]

    expect(() => { parseAsLogEntries(data) }).toThrow("2 件目のデータをメモとして読み込めませんでした。")
  })

  it("空の配列をそのまま返す", () => {
    expect(parseAsLogEntries([])).toEqual([])
  })
})
