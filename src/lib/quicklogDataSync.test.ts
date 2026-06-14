import type { LogEntry, QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchCloudLogEntries, upsertCloudLogEntries } from "@/lib/logEntryRepository"
import {
  fetchCloudLogEntryDeletions,
  recordLogEntryDeletions,
} from "@/lib/logEntryDeletionRepository"
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

const expectedLogEntryDeletions = [
  cloudLogEntryDeletion,
  sharedLogEntryDeletion,
  localLogEntryDeletion,
]

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
    logEntryDeletions: [localLogEntryDeletion],
  }
}

function expectDeletedLogEntriesToBeRemoved(data: QuicklogData) {
  const deletedLogEntryIds = new Set(data.logEntryDeletions.map((deletion) => deletion.logEntryId))
  expect(data.logEntries.some((entry) => deletedLogEntryIds.has(entry.id))).toBe(false)
}

function expectLogEntryDeletionsToBeRetained(data: QuicklogData) {
  expect(data.logEntryDeletions).toEqual(expectedLogEntryDeletions)
}

describe("mergeQuicklogDataWithCloud", () => {
  it("ローカルとリモートの QuicklogData をマージする", () => {
    const localData = createLocalData()
    const cloudData = createCloudData()
    const result = mergeQuicklogDataWithCloud(localData, cloudData)

    expect(result.data).toEqual({
      ...localData,
      logEntries: [localOnlyEntry, cloudOnlyEntry, sharedEntry],
      logEntryDeletions: expectedLogEntryDeletions,
    })
    expectDeletedLogEntriesToBeRemoved(result.data)
    expectLogEntryDeletionsToBeRetained(result.data)

    const repeatedResult = mergeQuicklogDataWithCloud(result.data, result.data)
    expect(repeatedResult.data).toEqual(result.data)
    expect(repeatedResult.addedCount).toBe(0)
    expect(repeatedResult.deletedCount).toBe(0)
    expect(repeatedResult.uploadedCount).toBe(0)

    expect(result.addedCount).toBe(1)
    expect(result.uploadedCount).toBe(1)
  })
})

describe("syncQuicklogDataWithCloud", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    expect(recordLogEntryDeletions).toHaveBeenCalledWith(expectedLogEntryDeletions, user)
    expect(result.data.logEntries).toEqual([localOnlyEntry, cloudOnlyEntry, sharedEntry])
    expectLogEntryDeletionsToBeRetained(result.data)
    expectDeletedLogEntriesToBeRemoved(result.data)

    vi.mocked(fetchCloudLogEntries).mockResolvedValue(result.data.logEntries)
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue(result.data.logEntryDeletions)

    const repeatedResult = await syncQuicklogDataWithCloud(result.data, user)

    expect(repeatedResult.data).toEqual(result.data)
    expect(repeatedResult.addedCount).toBe(0)
    expect(repeatedResult.deletedCount).toBe(0)
    expect(repeatedResult.uploadedCount).toBe(0)
  })

  it("cloud が空でも local data を残して upsert する", async () => {
    const localData = createLocalData()
    const user = { id: "user-id" } as unknown as User

    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    vi.mocked(recordLogEntryDeletions).mockResolvedValue()

    const result = await syncQuicklogDataWithCloud(localData, user)

    expect(result.data.logEntries).toEqual(localData.logEntries)
    expect(upsertCloudLogEntries).toHaveBeenCalledWith(localData.logEntries, user)
    expect(recordLogEntryDeletions).toHaveBeenCalledWith(localData.logEntryDeletions, user)
  })

  it("remote の log entries 取得に失敗したら upsert せず失敗を返す", async () => {
    const localData = createLocalData()
    const user = { id: "user-id" } as unknown as User
    const error = new Error("fetch failed")

    vi.mocked(fetchCloudLogEntries).mockRejectedValue(error)

    await expect(syncQuicklogDataWithCloud(localData, user)).rejects.toThrow(error)

    expect(upsertCloudLogEntries).not.toHaveBeenCalled()
    expect(recordLogEntryDeletions).not.toHaveBeenCalled()
  })

  it("remote の削除履歴取得に失敗したら upsert せず失敗を返す", async () => {
    const localData = createLocalData()
    const user = { id: "user-id" } as unknown as User
    const error = new Error("fetch deletions failed")

    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockRejectedValue(error)

    await expect(syncQuicklogDataWithCloud(localData, user)).rejects.toThrow(error)

    expect(upsertCloudLogEntries).not.toHaveBeenCalled()
    expect(recordLogEntryDeletions).not.toHaveBeenCalled()
  })

  it("upsert に失敗したら削除履歴を記録せず失敗を返す", async () => {
    const localData = createLocalData()
    const user = { id: "user-id" } as unknown as User
    const error = new Error("upsert failed")

    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    vi.mocked(upsertCloudLogEntries).mockRejectedValue(error)

    await expect(syncQuicklogDataWithCloud(localData, user)).rejects.toThrow(error)

    expect(recordLogEntryDeletions).not.toHaveBeenCalled()
  })
})
