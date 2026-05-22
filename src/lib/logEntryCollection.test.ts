import { describe, expect, it } from "vitest"
import { groupLogEntriesByDate, sortLogEntriesByCreatedAtDesc, sortLogEntriesByCreatedAtAsc, mergeLogEntries } from "./logEntryCollection"

describe("groupLogEntriesByDate", () => {
  it("LogEntry[] を DateGroup[] へグループ化できる", () => {
    const items = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-05-23T00:00:00.000Z" },
    ]

    const groups = groupLogEntriesByDate(items)

    expect(groups).toHaveLength(2)

    expect(groups[0].key).toBe("2026-05-22")
    expect(groups[0].date).toEqual(new Date(2026, 4, 22))
    expect(groups[0].items).toEqual([items[0], items[1]])

    expect(groups[1].key).toBe("2026-05-23")
    expect(groups[1].date).toEqual(new Date(2026, 4, 23))
    expect(groups[1].items).toEqual([items[2]])
  })

  it("空の配列は空の配列へグループ化される", () => {
    expect(groupLogEntriesByDate([])).toEqual([])
  })
})

describe("sortLogEntriesByCreatedAtDesc", () => {
  it("日時の降順にソートできる", () => {
    const items = [{ id: "id1", text: "text1", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-05-22T00:00:00.000Z" },
    ]
    const originalItems = [...items]

    expect(sortLogEntriesByCreatedAtDesc(items)).toEqual([items[1], items[0], items[2]])
    expect(items).toEqual(originalItems)
  })
})

describe("sortLogEntriesByCreatedAtAsc", () => {
  it("日時の昇順にソートできる", () => {
    const items = [{ id: "id1", text: "text1", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-05-22T00:00:00.000Z" },
    ]
    const originalItems = [...items]

    expect(sortLogEntriesByCreatedAtAsc(items)).toEqual([items[2], items[0], items[1]])
    expect(items).toEqual(originalItems)
  })
})

describe("mergeLogEntries", () => {
  it("すべての id が異なる LogEntry[] 同士をマージできる", () => {
    const existing = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
    ]
    const incoming = [
      { id: "id3", text: "text3", createdAt: "2026-05-24T00:00:00.000Z" },
    ]

    expect(mergeLogEntries(existing, incoming)).toEqual([existing[0], existing[1], incoming[0]])
  })

  it("マージした後の LogEntry[] が日時の昇順にソートされる", () => {
    const existing = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-22T00:00:00.000Z" },
    ]
    const incoming = [
      { id: "id3", text: "text3", createdAt: "2026-05-22T06:00:00.000Z" },
    ]

    expect(mergeLogEntries(existing, incoming)).toEqual([existing[1], incoming[0], existing[0]])
  })

  it("id に重複がある場合は既存の LogEntry を優先する", () => {
    const existing = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
    ]
    const incoming = [
      { id: "id1", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-05-24T00:00:00.000Z" },
    ]

    expect(mergeLogEntries(existing, incoming)).toEqual([existing[0], incoming[1]])
  })
})
