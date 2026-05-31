import { describe, expect, it } from "vitest";
import { mergeQuicklogData } from "./syncQuicklogData";

describe("mergeQuicklogData", () => {
  it("空のデータ同士を merge できる", () => {
    const version: 2 = 2
    const existing = { version, logEntries: [], syncOperations: [] }
    const incoming = { version, logEntries: [], syncOperations: [] }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.logEntries).toEqual([])
    expect(result.syncOperations).toEqual([])
    expect(result.version).toBe(2)
  })

  it("重複のない existing と incoming の logEntries がすべて結合される", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
  })

  it("重複のある existing と incoming の logEntries が重複なく merge される", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
    ])
  })

  it("logEntries が createdAt の昇順となる", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
  })

  it("existing の delete operation が incoming の entry を取り除く (entry を復活させない)", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      syncOperations: [
        { id: "sid1", type: "delete" as const, createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
      ],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
    expect(result.syncOperations).toEqual([
      { id: "sid1", type: "delete", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
    ])
  })

  it("incoming の delete operation が existing の entry を取り除く (他環境での delete を同期する)", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      syncOperations: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      syncOperations: [
        { id: "sid1", type: "delete" as const, createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.logEntries).toEqual([
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
    expect(result.syncOperations).toEqual([
      { id: "sid1", type: "delete", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
    ])
  })

  it("incoming と existing に同一の delete operation があっても重複なく merge される", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      ],
      syncOperations: [
        { id: "sid1", type: "delete" as const, createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
      ],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      syncOperations: [
        { id: "sid1", type: "delete" as const, createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.syncOperations).toEqual([
      { id: "sid1", type: "delete", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
    ])
  })

  it("削除対象の entry が存在しなくても delete operation は残ったままである", () => {
    const version: 2 = 2
    const existing = {
      version,
      logEntries: [],
      syncOperations: [
        { id: "sid1", type: "delete" as const, createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
      ],
    }
    const incoming = {
      version,
      logEntries: [],
      syncOperations: [
        { id: "sid2", type: "delete" as const, createdAt: "2026-06-02T12:00:00.000Z", entryId: "id2" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.syncOperations).toEqual([
      { id: "sid1", type: "delete", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" },
      { id: "sid2", type: "delete", createdAt: "2026-06-02T12:00:00.000Z", entryId: "id2" }
    ])
  })
})
