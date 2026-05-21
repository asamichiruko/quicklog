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
})
