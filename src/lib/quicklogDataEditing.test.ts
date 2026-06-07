import { describe, expect, it } from "vitest"
import type { QuicklogData } from "@/types"
import { appendLogEntry, createLogEntry, createLogEntryDeletion, removeLogEntry } from "./quicklogDataEditing"

describe("quicklogDataEditing", () => {
  const entry1 = {
    id: "entry1",
    text: "text1",
    createdAt: "2026-06-07T01:00:00.000Z",
  }
  const entry2 = {
    id: "entry2",
    text: "text2",
    createdAt: "2026-06-07T02:00:00.000Z",
  }
  const deletion1 = {
    logEntryId: "deleted1",
    createdAt: "2026-06-07T00:00:00.000Z",
  }

  const data = {
    version: 3,
    logEntries: [entry1],
    logEntryDeletions: [deletion1],
  } satisfies QuicklogData

  it("createLogEntry は指定した id, text, now から LogEntry を作る", () => {
    expect(createLogEntry("text", new Date("2026-06-07T03:00:00.000Z"), "entry3")).toEqual({
      id: "entry3",
      text: "text",
      createdAt: "2026-06-07T03:00:00.000Z",
    })
  })

  it("appendLogEntry は既存の QuicklogData を変更せずに LogEntry を追加する", () => {
    const result = appendLogEntry(data, entry2)

    expect(result).toEqual({
      version: 3,
      logEntries: [entry1, entry2],
      logEntryDeletions: [deletion1],
    })
    expect(data.logEntries).toEqual([entry1])
    expect(data.logEntryDeletions).toEqual([deletion1])
  })

  it("createLogEntryDeletion は指定した logEntryId, now から LogEntryDeletion を作る", () => {
    expect(createLogEntryDeletion("entry1", new Date("2026-06-07T04:00:00.000Z"))).toEqual({
      logEntryId: "entry1",
      createdAt: "2026-06-07T04:00:00.000Z",
    })
  })

  it("removeLogEntry は既存の QuicklogData を変更せずに LogEntry を削除し LogEntryDeletion を追加する", () => {
    const logEntryDeletion = {
      logEntryId: "entry1",
      createdAt: "2026-06-07T05:00:00.000Z",
    }

    const result = removeLogEntry(data, logEntryDeletion)

    expect(result).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [deletion1, logEntryDeletion],
    })
    expect(data.logEntries).toEqual([entry1])
    expect(data.logEntryDeletions).toEqual([deletion1])
  })

  it("removeLogEntry は同じ LogEntry の deletion があるとき createdAt が遅いものを残す", () => {
    const existingDeletion = {
      logEntryId: "entry1",
      createdAt: "2026-06-07T03:00:00.000Z",
    }
    const newerDeletion = {
      logEntryId: "entry1",
      createdAt: "2026-06-07T05:00:00.000Z",
    }

    const result = removeLogEntry(
      {
        version: 3,
        logEntries: [entry1],
        logEntryDeletions: [existingDeletion],
      },
      newerDeletion,
    )

    expect(result.logEntries).toEqual([])
    expect(result.logEntryDeletions).toEqual([newerDeletion])
  })
})
