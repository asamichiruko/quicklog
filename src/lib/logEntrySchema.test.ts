import { describe, expect, it } from "vitest"
import { isLogEntry } from "./logEntrySchema"

describe("isLogEntry", () => {
  it("valid な LogEntry を true と判定する", () => {
    const item = {
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    }

    expect(isLogEntry(item)).toBe(true)
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
})
