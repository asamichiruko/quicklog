import type { LogEntryDeletion } from "@/types"
import type { User } from "@supabase/supabase-js"
import { afterEach, describe, expect, it, vi } from "vitest"
import { deleteCloudLogEntries, deleteCloudLogEntry } from "@/lib/logEntryRepository"
import { recordLogEntryDeletion, recordLogEntryDeletions } from "./logEntryDeletionRepository"

const supabaseMocks = vi.hoisted(() => {
  const upsert = vi.fn()
  const from = vi.fn(() => ({ upsert }))

  return { from, upsert }
})

const logEntryRepositoryMocks = vi.hoisted(() => ({
  deleteCloudLogEntry: vi.fn(),
  deleteCloudLogEntries: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}))

vi.mock("@/lib/logEntryRepository", () => ({
  deleteCloudLogEntry: logEntryRepositoryMocks.deleteCloudLogEntry,
  deleteCloudLogEntries: logEntryRepositoryMocks.deleteCloudLogEntries,
}))

const user = { id: "user-id" } as unknown as User

const deletion = {
  logEntryId: "log-entry-id",
  createdAt: "2026-06-05T10:00:00.000Z",
} satisfies LogEntryDeletion

const otherDeletion = {
  logEntryId: "other-log-entry-id",
  createdAt: "2026-06-05T11:00:00.000Z",
} satisfies LogEntryDeletion

describe("recordLogEntryDeletion", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("削除履歴を記録してから log_entries の行を削除する", async () => {
    const calls: string[] = []
    supabaseMocks.upsert.mockImplementation(async () => {
      calls.push("upsert")
      return { error: null }
    })
    vi.mocked(deleteCloudLogEntry).mockImplementation(async () => {
      calls.push("delete")
    })

    await recordLogEntryDeletion(deletion, user)

    expect(supabaseMocks.from).toHaveBeenCalledWith("log_entry_deletions")
    expect(supabaseMocks.upsert).toHaveBeenCalledWith(
      {
        log_entry_id: "log-entry-id",
        user_id: "user-id",
        created_at: "2026-06-05T10:00:00.000Z",
      },
      { onConflict: "log_entry_id" },
    )
    expect(deleteCloudLogEntry).toHaveBeenCalledWith("log-entry-id", user)
    expect(calls).toEqual(["upsert", "delete"])
  })

  it("削除履歴の記録に失敗したら log_entries の行を削除しない", async () => {
    const error = new Error("upsert failed")
    supabaseMocks.upsert.mockResolvedValue({ error })

    await expect(recordLogEntryDeletion(deletion, user)).rejects.toThrow(error)

    expect(deleteCloudLogEntry).not.toHaveBeenCalled()
  })
})

describe("recordLogEntryDeletions", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("削除履歴をまとめて記録してから log_entries の行を削除する", async () => {
    const calls: string[] = []
    supabaseMocks.upsert.mockImplementation(async () => {
      calls.push("upsert")
      return { error: null }
    })
    vi.mocked(deleteCloudLogEntries).mockImplementation(async () => {
      calls.push("delete")
    })

    await recordLogEntryDeletions([deletion, otherDeletion], user)

    expect(supabaseMocks.from).toHaveBeenCalledWith("log_entry_deletions")
    expect(supabaseMocks.upsert).toHaveBeenCalledWith(
      [
        {
          log_entry_id: "log-entry-id",
          user_id: "user-id",
          created_at: "2026-06-05T10:00:00.000Z",
        },
        {
          log_entry_id: "other-log-entry-id",
          user_id: "user-id",
          created_at: "2026-06-05T11:00:00.000Z",
        },
      ],
      { onConflict: "log_entry_id" },
    )
    expect(deleteCloudLogEntries).toHaveBeenCalledWith(
      ["log-entry-id", "other-log-entry-id"],
      user,
    )
    expect(calls).toEqual(["upsert", "delete"])
  })

  it("削除履歴の記録に失敗したら log_entries の行を削除しない", async () => {
    const error = new Error("upsert failed")
    supabaseMocks.upsert.mockResolvedValue({ error })

    await expect(recordLogEntryDeletions([deletion, otherDeletion], user)).rejects.toThrow(error)

    expect(deleteCloudLogEntries).not.toHaveBeenCalled()
  })
})
