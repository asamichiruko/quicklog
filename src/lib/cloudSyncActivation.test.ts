import { activateCloudSync } from "@/lib/cloudSyncActivation"
import { CloudSyncActivationError, SizeError } from "@/errors"
import type { Session } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

function createOptions() {
  return {
    authenticate: vi.fn<() => Promise<void>>(),
    loadAuthenticatedSession: vi.fn<() => Promise<Session | null>>(),
    moveAnonymousDataToUser: vi.fn(),
    commitAuthenticatedSession: vi.fn(),
    rollback: vi.fn<() => Promise<void>>(),
  }
}

describe("activateCloudSync", () => {
  it("認証と匿名データ移行が成功すると移行先のセッションを確定し、rollback しない", async () => {
    const session = { user: { id: "user1" } } as Session
    const options = createOptions()
    options.authenticate.mockResolvedValue(undefined)
    options.loadAuthenticatedSession.mockResolvedValue(session)

    await expect(activateCloudSync(options)).resolves.toBeUndefined()
    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.loadAuthenticatedSession).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).toHaveBeenCalledExactlyOnceWith(session.user)
    expect(options.commitAuthenticatedSession).toHaveBeenCalledExactlyOnceWith(session)
    expect(options.rollback).not.toHaveBeenCalled()
  })

  it("認証が失敗するとセッション取得・移行・確定・rollback をせず認証エラーを返す", async () => {
    const authError = { code: "invalid_credentials" }
    const options = createOptions()
    options.authenticate.mockRejectedValue(authError)

    await expect(activateCloudSync(options)).rejects.toBe(authError)
    expect(options.loadAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).not.toHaveBeenCalled()
  })

  it("認証後のセッションが null なら移行・確定をせず rollback して開始エラーを返す", async () => {
    const options = createOptions()
    options.authenticate.mockResolvedValue(undefined)
    options.loadAuthenticatedSession.mockResolvedValue(null)
    options.rollback.mockResolvedValue(undefined)

    await expect(activateCloudSync(options)).rejects.toThrow(CloudSyncActivationError)
    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.loadAuthenticatedSession).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })

  it("認証後のセッション取得が失敗すると移行・確定をせず rollback して開始エラーを返す", async () => {
    const options = createOptions()
    options.authenticate.mockResolvedValue(undefined)
    options.loadAuthenticatedSession.mockRejectedValue(new Error("load failed"))
    options.rollback.mockResolvedValue(undefined)

    await expect(activateCloudSync(options)).rejects.toThrow(CloudSyncActivationError)
    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.loadAuthenticatedSession).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).not.toHaveBeenCalled()
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })

  it("認証後の匿名データ移行がサイズ超過で失敗すると確定せず rollback して理由を返す", async () => {
    const session = { user: { id: "user1" } } as Session
    const options = createOptions()
    options.authenticate.mockResolvedValue(undefined)
    options.loadAuthenticatedSession.mockResolvedValue(session)
    options.moveAnonymousDataToUser.mockImplementation(() => {
      throw new SizeError("too large")
    })
    options.rollback.mockResolvedValue(undefined)

    await expect(activateCloudSync(options)).rejects.toThrow(
      "記録が多すぎるため、クラウド同期を開始できませんでした",
    )
    expect(options.authenticate).toHaveBeenCalledOnce()
    expect(options.moveAnonymousDataToUser).toHaveBeenCalledExactlyOnceWith(session.user)
    expect(options.commitAuthenticatedSession).not.toHaveBeenCalled()
    expect(options.rollback).toHaveBeenCalledOnce()
  })
})
