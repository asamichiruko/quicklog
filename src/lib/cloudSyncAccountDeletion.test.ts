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

function createOptions(
  anonymousData: QuicklogData,
  accountData: QuicklogData,
  overrides: Partial<Parameters<typeof deleteCloudSyncData>[0]> = {},
) {
  return {
    loadAnonymousData: vi.fn(() => anonymousData),
    loadUserData: vi.fn(() => accountData),
    saveAnonymousData: vi.fn(),
    clearUserData: vi.fn(),
    deleteCurrentAccount: vi.fn<() => Promise<void>>(),
    clearLocalAuthSession: vi.fn<() => Promise<void>>(),
    onLocalAuthSessionClearError: vi.fn(),
    ...overrides,
  }
}

describe("deleteCloudSyncData", () => {
  it("匿名データが空の状態でアカウントを削除すると退避後にサーバー削除を待ち、ローカルデータを消す", async () => {
    const options = createOptions(emptyData, userData)
    vi.mocked(options.clearLocalAuthSession).mockResolvedValue(undefined)
    let backupAtServerDeletionStart: QuicklogData | undefined
    let completeServerDeletion!: () => void
    vi.mocked(options.deleteCurrentAccount).mockImplementationOnce(() => {
      backupAtServerDeletionStart = vi.mocked(options.saveAnonymousData).mock.calls.at(-1)?.[0]
      return new Promise<void>((resolve) => {
        completeServerDeletion = resolve
      })
    })

    const deletion = deleteCloudSyncData(options)

    // サーバー削除の開始時点と、応答を待つ間の退避・元データ保持を確認する。
    expect(backupAtServerDeletionStart).toEqual(userData)
    expect(options.saveAnonymousData).toHaveBeenCalledExactlyOnceWith(userData)
    expect(options.deleteCurrentAccount).toHaveBeenCalledOnce()
    expect(options.clearUserData).not.toHaveBeenCalled()
    expect(options.clearLocalAuthSession).not.toHaveBeenCalled()

    completeServerDeletion()

    await expect(deletion).resolves.toBeUndefined()
    expect(options.loadAnonymousData).toHaveBeenCalledOnce()
    expect(options.loadUserData).toHaveBeenCalledOnce()
    expect(options.saveAnonymousData).toHaveBeenCalledWith(userData)
    expect(options.deleteCurrentAccount).toHaveBeenCalledOnce()
    expect(options.clearUserData).toHaveBeenCalledOnce()
    expect(options.clearLocalAuthSession).toHaveBeenCalledOnce()
  })

  it("匿名の削除履歴が残った状態でアカウントを削除すると退避もサーバー削除も開始しない", async () => {
    const anonymousDataWithDeletion = {
      version: 3,
      logEntries: [],
      logEntryDeletions: [{ logEntryId: "log1", createdAt: "2026-06-12T00:00:00.000Z" }],
    } satisfies QuicklogData
    const options = createOptions(anonymousDataWithDeletion, userData)

    await expect(deleteCloudSyncData(options)).rejects.toThrow(CloudSyncDeletionError)
    expect(options.loadUserData).not.toHaveBeenCalled()
    expect(options.saveAnonymousData).not.toHaveBeenCalled()
    expect(options.deleteCurrentAccount).not.toHaveBeenCalled()
  })

  it("匿名のメモが残った状態でアカウントを削除すると退避もサーバー削除も開始しない", async () => {
    const anonymousDataWithEntry = {
      version: 3,
      logEntries: [{ id: "anonymous1", text: "匿名の記録", createdAt: "2026-06-12T00:00:00.000Z" }],
      logEntryDeletions: [],
    } satisfies QuicklogData
    const options = createOptions(anonymousDataWithEntry, userData)

    await expect(deleteCloudSyncData(options)).rejects.toThrow(CloudSyncDeletionError)
    expect(options.loadUserData).not.toHaveBeenCalled()
    expect(options.saveAnonymousData).not.toHaveBeenCalled()
    expect(options.deleteCurrentAccount).not.toHaveBeenCalled()
    expect(options.clearUserData).not.toHaveBeenCalled()
  })

  it("匿名への退避に失敗するとアカウント削除も元データの削除も開始しない", async () => {
    const options = createOptions(emptyData, userData, {
      saveAnonymousData: vi.fn(() => {
        throw new Error("storage unavailable")
      }),
    })

    await expect(deleteCloudSyncData(options)).rejects.toThrow(
      "この端末に記録を保存できないため、削除を開始できませんでした",
    )
    expect(options.deleteCurrentAccount).not.toHaveBeenCalled()
    expect(options.clearUserData).not.toHaveBeenCalled()
    expect(options.clearLocalAuthSession).not.toHaveBeenCalled()
  })

  it("サーバーのアカウント削除が失敗すると匿名データを元に戻してユーザーデータを保持する", async () => {
    const options = createOptions(emptyData, userData, {
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

  it("サーバー削除後にローカル Auth 解除が失敗しても削除成功として扱い、解除エラーを通知する", async () => {
    const clearError = new Error("clear failed")
    const options = createOptions(emptyData, userData, {
      clearLocalAuthSession: vi.fn().mockRejectedValue(clearError),
    })
    vi.mocked(options.deleteCurrentAccount).mockResolvedValue(undefined)

    await expect(deleteCloudSyncData(options)).resolves.toBeUndefined()
    expect(options.clearUserData).toHaveBeenCalledOnce()
    expect(options.onLocalAuthSessionClearError).toHaveBeenCalledWith(clearError)
  })
})
