import type { LogEntry, QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import { fetchRemoteLogEntries, upsertRemoteLogEntries } from "@/lib/logEntryRepository"
import { mergeLogEntriesWithRemote, syncLogEntriesWithRemote } from "./cloudLogEntrySync"

vi.mock("@/lib/logEntryRepository", () => ({
  fetchRemoteLogEntries: vi.fn(),
  upsertRemoteLogEntries: vi.fn(),
}))

const localOnlyEntry = {
  id: "local-only",
  text: "local",
  createdAt: "2026-06-05T10:00:00.000Z",
} satisfies LogEntry

const remoteOnlyEntry = {
  id: "remote-only",
  text: "remote",
  createdAt: "2026-06-05T11:00:00.000Z",
} satisfies LogEntry

const sharedEntry = {
  id: "shared",
  text: "shared",
  createdAt: "2026-06-05T12:00:00.000Z",
} satisfies LogEntry

function createLocalData(): QuicklogData {
  return {
    version: 2,
    logEntries: [localOnlyEntry, sharedEntry],
    syncOperations: [
      {
        id: "delete-operation",
        type: "delete",
        entryId: "remote-only",
        createdAt: "2026-06-05T13:00:00.000Z",
      },
    ],
  }
}

describe("mergeLogEntriesWithRemote", () => {
  it("SyncOperation を適用せず、ローカルとリモートの LogEntry を id でマージする", () => {
    const localData = createLocalData()
    const result = mergeLogEntriesWithRemote(localData, [remoteOnlyEntry, sharedEntry])

    expect(result.data).toEqual({
      ...localData,
      logEntries: [localOnlyEntry, remoteOnlyEntry, sharedEntry],
    })
    expect(result.addedCount).toBe(1)
    expect(result.uploadedCount).toBe(1)
  })
})

describe("syncLogEntriesWithRemote", () => {
  it("リモートから取得したメモをマージして Supabase に upsert する", async () => {
    const localData = createLocalData()
    const user = { id: "user-id" } as unknown as User

    vi.mocked(fetchRemoteLogEntries).mockResolvedValue([remoteOnlyEntry, sharedEntry])
    vi.mocked(upsertRemoteLogEntries).mockResolvedValue()

    const result = await syncLogEntriesWithRemote(localData, user)

    expect(fetchRemoteLogEntries).toHaveBeenCalledWith(user)
    expect(upsertRemoteLogEntries).toHaveBeenCalledWith(
      [localOnlyEntry, remoteOnlyEntry, sharedEntry],
      user,
    )
    expect(result.data.logEntries).toEqual([localOnlyEntry, remoteOnlyEntry, sharedEntry])
  })
})
