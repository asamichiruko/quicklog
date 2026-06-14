import { deleteCloudSyncData } from "@/lib/cloudSyncAccountDeletion"
import { CloudSyncDeletionError } from "@/errors"
import type { QuicklogData } from "@/types"
import { describe, expect, it, vi } from "vitest"

const emptyData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

const userData = {
  version: 3,
  logEntries: [
    {
      id: "log1",
      text: "hello",
      createdAt: "2026-06-12T00:00:00.000Z",
    },
  ],
  logEntryDeletions: [],
} satisfies QuicklogData

function createOptions(overrides: Partial<Parameters<typeof deleteCloudSyncData>[0]> = {}) {
  return {
    loadAnonymousData: vi.fn(() => emptyData),
    loadUserData: vi.fn(() => userData),
    saveAnonymousData: vi.fn(),
    clearUserData: vi.fn(),
    deleteCurrentAccount: vi.fn().mockResolvedValue(undefined),
    clearLocalAuthSession: vi.fn().mockResolvedValue(undefined),
    onLocalAuthSessionClearError: vi.fn(),
    ...overrides,
  }
}

describe("deleteCloudSyncData", () => {
  it("user data を anonymous に退避してからアカウントを削除し、ローカルの clear を行う", async () => {
    const options = createOptions()

    await expect(deleteCloudSyncData(options)).resolves.toBeUndefined()

    expect(options.loadAnonymousData).toHaveBeenCalledOnce()
    expect(options.loadUserData).toHaveBeenCalledOnce()
    expect(options.saveAnonymousData).toHaveBeenCalledWith(userData)
    expect(options.deleteCurrentAccount).toHaveBeenCalledOnce()
    expect(options.clearUserData).toHaveBeenCalledOnce()
    expect(options.clearLocalAuthSession).toHaveBeenCalledOnce()
  })

  it("匿名データが残っている場合は削除を開始しない", async () => {
    const options = createOptions({
      loadAnonymousData: vi.fn(() => ({
        ...emptyData,
        logEntryDeletions: [{ logEntryId: "log1", createdAt: "2026-06-12T00:00:00.000Z" }],
      })),
    })

    await expect(deleteCloudSyncData(options)).rejects.toThrow(CloudSyncDeletionError)

    expect(options.loadUserData).not.toHaveBeenCalled()
    expect(options.saveAnonymousData).not.toHaveBeenCalled()
    expect(options.deleteCurrentAccount).not.toHaveBeenCalled()
  })

  it("アカウント削除に失敗したら anonymous data を元に戻す", async () => {
    const options = createOptions({
      deleteCurrentAccount: vi.fn().mockRejectedValue(new Error("delete failed")),
    })

    await expect(deleteCloudSyncData(options)).rejects.toThrow(
      "クラウド同期アカウントを削除できませんでした",
    )

    expect(options.saveAnonymousData).toHaveBeenNthCalledWith(1, userData)
    expect(options.saveAnonymousData).toHaveBeenNthCalledWith(2, emptyData)
    expect(options.clearUserData).not.toHaveBeenCalled()
    expect(options.clearLocalAuthSession).not.toHaveBeenCalled()
  })

  it("ローカル auth session の破棄に失敗しても削除成功として扱う", async () => {
    const clearError = new Error("clear failed")
    const options = createOptions({
      clearLocalAuthSession: vi.fn().mockRejectedValue(clearError),
    })

    await expect(deleteCloudSyncData(options)).resolves.toBeUndefined()

    expect(options.clearUserData).toHaveBeenCalledOnce()
    expect(options.onLocalAuthSessionClearError).toHaveBeenCalledWith(clearError)
  })
})
