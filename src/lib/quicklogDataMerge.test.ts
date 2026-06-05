import { describe, expect, it } from "vitest";
import { mergeQuicklogData, pruneExpiredLogEntryDeletions } from "./quicklogDataMerge";

describe("mergeQuicklogData", () => {
  it("空のデータ同士を merge できる", () => {
    const version: 3 = 3
    const existing = { version, logEntries: [], logEntryDeletions: [] }
    const incoming = { version, logEntries: [], logEntryDeletions: [] }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    })
    expect(result.addedCount).toBe(0)
    expect(result.deletedCount).toBe(0)
  })

  it("重複のない existing と incoming の logEntries がすべて結合される", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
    expect(result.addedCount).toBe(2)
    expect(result.deletedCount).toBe(0)
  })

  it("重複のある existing と incoming の logEntries が重複なく merge される", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
    ])
    expect(result.addedCount).toBe(1)
    expect(result.deletedCount).toBe(0)
  })

  it("logEntries が createdAt の昇順となる", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
    expect(result.addedCount).toBe(2)
    expect(result.deletedCount).toBe(0)
  })

  it("existing の delete operation が incoming の entry を取り除く (entry を復活させない)", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
      ],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntries).toEqual([
      { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
    expect(result.data.logEntryDeletions).toEqual([
      { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
    ])
    expect(result.addedCount).toBe(1)
    expect(result.deletedCount).toBe(0)
  })

  it("incoming の delete operation が existing の entry を取り除く (他環境での delete を同期する)", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      logEntryDeletions: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
        { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntries).toEqual([
      { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-06-03T00:00:00.000Z" },
      { id: "id4", text: "text4", createdAt: "2026-06-04T00:00:00.000Z" },
    ])
    expect(result.data.logEntryDeletions).toEqual([
      { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
    ])
    expect(result.addedCount).toBe(2)
    expect(result.deletedCount).toBe(1)
  })

  it("incoming と existing に同一の delete operation があっても重複なく merge される", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
      ],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id2", text: "text2", createdAt: "2026-06-02T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntryDeletions).toEqual([
      { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id3" }
    ])
    expect(result.addedCount).toBe(1)
    expect(result.deletedCount).toBe(0)
  })

  it("削除対象の entry が存在しなくても delete operation は残ったままである", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [],
      logEntryDeletions: [
        { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
      ],
    }
    const incoming = {
      version,
      logEntries: [],
      logEntryDeletions: [
        { id: "sid2", createdAt: "2026-06-02T12:00:00.000Z", entryId: "id2" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntryDeletions).toEqual([
      { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" },
      { id: "sid2", createdAt: "2026-06-02T12:00:00.000Z", entryId: "id2" }
    ])
    expect(result.addedCount).toBe(0)
    expect(result.deletedCount).toBe(0)
  })

  it("削除対象の entry が incoming に含まれていたら取り除かれる", () => {
    const version: 3 = 3
    const existing = {
      version,
      logEntries: [],
      logEntryDeletions: [],
    }
    const incoming = {
      version,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-06-01T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" }
      ],
    }
    const result = mergeQuicklogData(existing, incoming)

    expect(result.data.logEntries).toEqual([])
    expect(result.data.logEntryDeletions).toEqual([
      { id: "sid1", createdAt: "2026-06-01T12:00:00.000Z", entryId: "id1" },
    ])
    expect(result.addedCount).toBe(0)
    expect(result.deletedCount).toBe(0)
  })
})

describe("pruneExpiredLogEntryDeletions", () => {
  it("期限が切れた LogEntryDeletion が prune される", () => {
    const logEntryDeletions = [
      { id: "sid1", createdAt: new Date(2026, 4, 1).toISOString(), entryId: "id1" },
    ]
    const result = pruneExpiredLogEntryDeletions(logEntryDeletions, new Date(2026, 5, 1), 3)
    expect(result).toEqual([])
  })

  it("期限が切れていない LogEntryDeletion は prune されない", () => {
    const logEntryDeletions = [
      { id: "sid1", createdAt: new Date(2026, 4, 1).toISOString(), entryId: "id1" },
    ]
    const result = pruneExpiredLogEntryDeletions(logEntryDeletions, new Date(2026, 5, 1), 60)
    expect(result).toEqual(logEntryDeletions)
  })

  it("有効な LogEntryDeletion と期限切れのものが混在しているとき、期限切れのもののみ prune される", () => {
    const logEntryDeletions = [
      { id: "sid1", createdAt: new Date(2026, 4, 1).toISOString(), entryId: "id1" },
      { id: "sid2", createdAt: new Date(2026, 4, 20).toISOString(), entryId: "id2" },
    ]
    const result = pruneExpiredLogEntryDeletions(logEntryDeletions, new Date(2026, 5, 1), 15)
    expect(result).toEqual([logEntryDeletions[1]])
  })

  it("ちょうど有効期限にある LogEntryDeletion は prune されない", () => {
    const logEntryDeletions = [
      { id: "sid1", createdAt: new Date(2026, 4, 14, 23, 59, 59, 999).toISOString(), entryId: "id1" },
      { id: "sid2", createdAt: new Date(2026, 4, 15, 0, 0, 0, 0).toISOString(), entryId: "id2" },
      { id: "sid3", createdAt: new Date(2026, 4, 15, 0, 0, 0, 1).toISOString(), entryId: "id3" },
    ]
    const result = pruneExpiredLogEntryDeletions(logEntryDeletions, new Date(2026, 4, 16), 1)
    expect(result).toEqual([logEntryDeletions[1], logEntryDeletions[2]])
  })

  it("有効期限は日付だけが参照される", () => {
    const logEntryDeletions = [
      { id: "sid1", createdAt: new Date(2026, 4, 14, 12, 0, 0, 0).toISOString(), entryId: "id1" },
      { id: "sid2", createdAt: new Date(2026, 4, 14, 8, 0, 0, 0).toISOString(), entryId: "id2" },
    ]
    const result = pruneExpiredLogEntryDeletions(logEntryDeletions, new Date(2026, 4, 15, 10, 0, 0, 0), 1)
    expect(result).toEqual(logEntryDeletions)
  })
})
