import type { LogEntry, QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import { fetchCloudLogEntries, upsertCloudLogEntries } from "@/lib/logEntryRepository"
import { fetchCloudLogEntryDeletions, recordLogEntryDeletions } from "@/lib/logEntryDeletionRepository"
import { mergeQuicklogDataWithCloud, syncQuicklogDataWithCloud } from "./quicklogDataSync"

vi.mock("@/lib/logEntryRepository", () => ({
  fetchCloudLogEntries: vi.fn(),
  upsertCloudLogEntries: vi.fn(),
}))

vi.mock("@/lib/logEntryDeletionRepository", () => ({
  fetchCloudLogEntryDeletions: vi.fn(),
  recordLogEntryDeletions: vi.fn(),
}))

const localOnlyEntry = {
  id: "local-only",
  text: "local",
  createdAt: "2026-06-05T10:00:00.000Z",
} satisfies LogEntry

const localDeletedEntry = {
  id: "local-deleted",
  text: "local-deleted",
  createdAt: "2026-06-05T10:30:00.000Z",
} satisfies LogEntry

const cloudOnlyEntry = {
  id: "cloud-only",
  text: "cloud",
  createdAt: "2026-06-05T11:00:00.000Z",
} satisfies LogEntry

const cloudDeletedEntry = {
  id: "cloud-deleted",
  text: "cloud-deleted",
  createdAt: "2026-06-05T11:30:00.000Z",
} satisfies LogEntry

const sharedEntry = {
  id: "shared",
  text: "shared",
  createdAt: "2026-06-05T12:00:00.000Z",
} satisfies LogEntry

const sharedDeletedEntry = {
  id: "shared-deleted",
  text: "shared-deleted",
  createdAt: "2026-06-05T12:30:00.000Z",
} satisfies LogEntry

const localLogEntryDeletion = {
  logEntryId: "local-deleted",
  createdAt: "2026-06-05T15:00:00.000Z",
}

const cloudLogEntryDeletion = {
  logEntryId: "cloud-deleted",
  createdAt: "2026-06-05T13:00:00.000Z",
}

const sharedLogEntryDeletion = {
  logEntryId: "shared-deleted",
  createdAt: "2026-06-05T14:00:00.000Z",
}

function createLocalData(): QuicklogData {
  return {
    version: 3,
    logEntries: [localOnlyEntry, localDeletedEntry, sharedEntry],
    logEntryDeletions: [cloudLogEntryDeletion, sharedLogEntryDeletion],
  }
}

function createCloudData(): QuicklogData {
  return {
    version: 3,
    logEntries: [cloudOnlyEntry, cloudDeletedEntry, sharedEntry, sharedDeletedEntry],
    logEntryDeletions: [localLogEntryDeletion]
  }
}

describe("mergeQuicklogDataWithCloud", () => {
  it("ローカルとリモートの QuicklogData をマージする", () => {
    const localData = createLocalData()
    const cloudData = createCloudData()
    const result = mergeQuicklogDataWithCloud(localData, cloudData)

    expect(result.data).toEqual({
      ...localData,
      logEntries: [localOnlyEntry, cloudOnlyEntry, sharedEntry],
      logEntryDeletions: [cloudLogEntryDeletion, sharedLogEntryDeletion, localLogEntryDeletion],
    })
    expect(result.addedCount).toBe(1)
    expect(result.uploadedCount).toBe(1)
  })
})

describe("syncQuicklogDataWithCloud", () => {
  it("リモートから取得したデータをマージして Supabase に upsert する", async () => {
    const localData = createLocalData()
    const cloudData = createCloudData()
    const user = { id: "user-id" } as unknown as User

    vi.mocked(fetchCloudLogEntries).mockResolvedValue(cloudData.logEntries)
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue(cloudData.logEntryDeletions)
    vi.mocked(recordLogEntryDeletions).mockResolvedValue()

    const result = await syncQuicklogDataWithCloud(localData, user)

    expect(fetchCloudLogEntries).toHaveBeenCalledWith(user)
    expect(upsertCloudLogEntries).toHaveBeenCalledWith(
      [localOnlyEntry, cloudOnlyEntry, sharedEntry],
      user,
    )
    expect(recordLogEntryDeletions).toHaveBeenCalledWith(
      [cloudLogEntryDeletion, sharedLogEntryDeletion, localLogEntryDeletion],
      user
    )
    expect(result.data.logEntries).toEqual([localOnlyEntry, cloudOnlyEntry, sharedEntry])
    expect(result.data.logEntryDeletions).toEqual([cloudLogEntryDeletion, sharedLogEntryDeletion, localLogEntryDeletion])
  })
})
