import { activateCloudSync } from "@/lib/cloudSyncActivation"
import { CloudSyncActivationError, SizeError } from "@/errors"
import type { Session, User } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

function createOptions(overrides: Partial<Parameters<typeof activateCloudSync>[0]> = {}) {
  const session = { user: { id: "user1" } as User } as Session

  return {
    session,
    options: {
      authenticate: vi.fn().mockResolvedValue(undefined),
      loadAuthenticatedSession: vi.fn().mockResolvedValue(session),
      moveAnonymousDataToUser: vi.fn(),
      commitAuthenticatedSession: vi.fn(),
      rollback: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  }
}

describe("activateCloudSync", () => {
  it("認証、session の読み込み、匿名データ移行に成功すると rollback しない", async () => {
    const { session, options } = createOptions()

    await expect(activateCloudSync(options)).resolves.toBeUndefined()

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.loadAuthenticatedSession).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).toHaveBeenCalledWith(session.user)
    expect(options.commitAuthenticatedSession).toHaveBeenCalledExactlyOnceWith(session)
    expect(options.rollback).not.toHaveBeenCalled()
  })

  it("認証に失敗したら rollback せず認証エラーをそのまま返す", async () => {
    const authError = { code: "invalid_credentials" }
    const { options } = createOptions({
      authenticate: vi.fn().mockRejectedValue(authError),
    })

    await expect(activateCloudSync(options)).rejects.toBe(authError)

    expect(options.loadAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).not.toHaveBeenCalled()
  })

  it("session が取得できなかった場合は rollback して CloudSyncStartError を返す", async () => {
    const { options } = createOptions({
      loadAuthenticatedSession: vi.fn().mockResolvedValue(null),
    })

    await expect(activateCloudSync(options)).rejects.toThrow(CloudSyncActivationError)

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.loadAuthenticatedSession).toHaveBeenCalledWith()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })

  it("session の取得中に例外が発生したら rollback して CloudSyncStartError を返す", async () => {
    const { options } = createOptions({
      loadAuthenticatedSession: vi.fn().mockRejectedValue(new Error("load failed")),
    })

    await expect(activateCloudSync(options)).rejects.toThrow(CloudSyncActivationError)

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.loadAuthenticatedSession).toHaveBeenCalledWith()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })

  it("匿名データ移行に失敗したら rollback して CloudSyncStartError を返す", async () => {
    const { session, options } = createOptions({
      moveAnonymousDataToUser: vi.fn(() => {
        throw new SizeError("too large")
      }),
    })

    await expect(activateCloudSync(options)).rejects.toThrow(
      "記録が多すぎるため、クラウド同期を開始できませんでした",
    )

    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).toHaveBeenCalledWith(session.user)
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })
})
