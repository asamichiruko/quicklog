import { startCloudSync } from "@/lib/cloudSyncStart"
import { CloudSyncStartError, SizeError } from "@/lib/errors"
import type { User } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

function createOptions(overrides: Partial<Parameters<typeof startCloudSync>[0]> = {}) {
  const user = { id: "user1" } as User

  return {
    user,
    options: {
      authenticate: vi.fn().mockResolvedValue(undefined),
      reloadAuthState: vi.fn().mockResolvedValue(undefined),
      getActiveUser: vi.fn(() => user),
      moveAnonymousDataToUser: vi.fn(),
      rollback: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  }
}

describe("startCloudSync", () => {
  it("認証、認証状態の再読み込み、匿名データ移行に成功すると rollback しない", async () => {
    const { user, options } = createOptions()

    await expect(startCloudSync(options)).resolves.toBeUndefined()

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.reloadAuthState).toHaveBeenCalledOnce()
    expect(options.getActiveUser).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).toHaveBeenCalledWith(user)
    expect(options.rollback).not.toHaveBeenCalled()
  })

  it("認証に失敗したら rollback せず認証エラーをそのまま返す", async () => {
    const authError = { code: "invalid_credentials" }
    const { options } = createOptions({
      authenticate: vi.fn().mockRejectedValue(authError),
    })

    await expect(startCloudSync(options)).rejects.toBe(authError)

    expect(options.reloadAuthState).not.toHaveBeenCalled()
    expect(options.getActiveUser).not.toHaveBeenCalled()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.rollback).not.toHaveBeenCalled()
  })

  it("認証状態の再読み込みに失敗したら rollback して CloudSyncStartError を返す", async () => {
    const { options } = createOptions({
      reloadAuthState: vi.fn().mockRejectedValue(new Error("reload failed")),
    })

    await expect(startCloudSync(options)).rejects.toThrow(CloudSyncStartError)

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.reloadAuthState).toHaveBeenCalledOnce()
    expect(options.getActiveUser).not.toHaveBeenCalled()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })

  it("active user を確認できないと rollback して CloudSyncStartError を返す", async () => {
    const { options } = createOptions({
      getActiveUser: vi.fn(() => null),
    })

    await expect(startCloudSync(options)).rejects.toThrow(
      "サインイン状態を確認できませんでした。時間をおいて再度お試しください",
    )

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.reloadAuthState).toHaveBeenCalledOnce()
    expect(options.getActiveUser).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })

  it("匿名データ移行に失敗したら rollback して CloudSyncStartError を返す", async () => {
    const { user, options } = createOptions({
      moveAnonymousDataToUser: vi.fn(() => {
        throw new SizeError("too large")
      }),
    })

    await expect(startCloudSync(options)).rejects.toThrow(
      "記録が多すぎるため、クラウド同期を開始できませんでした",
    )

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.reloadAuthState).toHaveBeenCalledOnce()
    expect(options.getActiveUser).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).toHaveBeenCalledWith(user)
    expect(options.rollback).toHaveBeenCalledOnce()
  })
})
