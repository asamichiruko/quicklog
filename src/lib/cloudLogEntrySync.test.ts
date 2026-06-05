import type { LogEntry, QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import { fetchCloudLogEntries, upsertCloudLogEntries } from "@/lib/logEntryRepository"
import { mergeLogEntriesWithCloud, syncLogEntriesWithCloud } from "./cloudLogEntrySync"

vi.mock("@/lib/logEntryRepository", () => ({
  fetchCloudLogEntries: vi.fn(),
  upsertCloudLogEntries: vi.fn(),
}))

const localOnlyEntry = {
  id: "local-only",
  text: "local",
  createdAt: "2026-06-05T10:00:00.000Z",
} satisfies LogEntry

const cloudOnlyEntry = {
  id: "cloud-only",
  text: "cloud",
  createdAt: "2026-06-05T11:00:00.000Z",
} satisfies LogEntry

const sharedEntry = {
  id: "shared",
  text: "shared",
  createdAt: "2026-06-05T12:00:00.000Z",
} satisfies LogEntry

function createLocalData(): QuicklogData {
  return {
    version: 3,
    logEntries: [localOnlyEntry, sharedEntry],
    logEntryDeletions: [
      {
        entryId: "cloud-only",
        createdAt: "2026-06-05T13:00:00.000Z",
      },
    ],
  }
}

describe("mergeLogEntriesWithCloud", () => {
  it("LogEntryDeletion を適用せず、ローカルとリモートの LogEntry を id でマージする", () => {
    const localData = createLocalData()
    const result = mergeLogEntriesWithCloud(localData, [cloudOnlyEntry, sharedEntry])

    expect(result.data).toEqual({
      ...localData,
      logEntries: [localOnlyEntry, cloudOnlyEntry, sharedEntry],
    })
    expect(result.addedCount).toBe(1)
    expect(result.uploadedCount).toBe(1)
  })
})

describe("syncLogEntriesWithCloud", () => {
  it("リモートから取得したメモをマージして Supabase に upsert する", async () => {
    const localData = createLocalData()
    const user = { id: "user-id" } as unknown as User

    vi.mocked(fetchCloudLogEntries).mockResolvedValue([cloudOnlyEntry, sharedEntry])
    vi.mocked(upsertCloudLogEntries).mockResolvedValue()

    const result = await syncLogEntriesWithCloud(localData, user)

    expect(fetchCloudLogEntries).toHaveBeenCalledWith(user)
    expect(upsertCloudLogEntries).toHaveBeenCalledWith(
      [localOnlyEntry, cloudOnlyEntry, sharedEntry],
      user,
    )
    expect(result.data.logEntries).toEqual([localOnlyEntry, cloudOnlyEntry, sharedEntry])
  })
})
