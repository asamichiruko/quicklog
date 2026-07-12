import { createPasswordRecoveryFlow } from "@/lib/passwordRecovery"
import { describe, expect, it, vi } from "vitest"

function createDeferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

function setup() {
  const verifyPasswordResetCode = vi.fn()
  const updatePasswordAfterRecovery = vi.fn()
  const clearLocalAuthSession = vi.fn()
  const activateAnonymousScope = vi.fn()
  const onLocalAuthSessionClearError = vi.fn()

  const flow = createPasswordRecoveryFlow({
    verifyPasswordResetCode,
    updatePasswordAfterRecovery,
    clearLocalAuthSession,
    activateAnonymousScope,
    onLocalAuthSessionClearError,
  })

  return {
    flow,
    verifyPasswordResetCode,
    updatePasswordAfterRecovery,
    clearLocalAuthSession,
    activateAnonymousScope,
    onLocalAuthSessionClearError,
  }
}

describe("createPasswordRecoveryFlow", () => {
  it("初期状態は recovery が進行中でない", () => {
    const { flow } = setup()

    expect(flow.isInProgress()).toBe(false)
  })

  it("コード検証中は recovery が進行中になる", async () => {
    const { flow, verifyPasswordResetCode } = setup()
    const verification = createDeferred()
    verifyPasswordResetCode.mockImplementation(() => verification.promise)
    const verificationPromise = flow.verifyPasswordResetCode("user@example.com", "123456")

    expect(flow.isInProgress()).toBe(true)

    verification.resolve()
    await verificationPromise
  })

  it("コード検証に成功後も進行中状態を維持する", async () => {
    const { flow } = setup()

    await flow.verifyPasswordResetCode("user@example.com", "123456")

    expect(flow.isInProgress()).toBe(true)
  })

  it("コード検証に失敗したら進行中状態を解除する", async () => {
    const { flow, verifyPasswordResetCode } = setup()
    const verification = createDeferred()
    const error = new Error("verification failed")
    verifyPasswordResetCode.mockImplementation(() => verification.promise)
    const verificationPromise = flow.verifyPasswordResetCode("user@example.com", "123456")

    expect(flow.isInProgress()).toBe(true)

    verification.reject(error)

    await expect(verificationPromise).rejects.toBe(error)
    expect(flow.isInProgress()).toBe(false)
  })

  it("パスワード更新成功後はセッションを解除して anonymous へ戻る", async () => {
    const { flow, clearLocalAuthSession, activateAnonymousScope } = setup()

    await flow.verifyPasswordResetCode("user@example.com", "123456")
    await flow.updatePasswordAfterRecovery("Password1!")

    expect(flow.isInProgress()).toBe(false)
    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
    expect(activateAnonymousScope).toHaveBeenCalledOnce()
  })

  it("セッション解除失敗時も anonymous へ戻る", async () => {
    const { flow, clearLocalAuthSession, activateAnonymousScope, onLocalAuthSessionClearError } =
      setup()
    const error = new Error("clear session failed")
    clearLocalAuthSession.mockRejectedValue(error)

    await flow.verifyPasswordResetCode("user@example.com", "123456")
    await flow.updatePasswordAfterRecovery("Password1!")

    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
    expect(onLocalAuthSessionClearError).toHaveBeenCalledWith(error, "completed")
    expect(activateAnonymousScope).toHaveBeenCalledOnce()
    expect(flow.isInProgress()).toBe(false)
  })

  it("パスワード更新失敗時はセッション解除と anonymous 遷移を行わない", async () => {
    const {
      flow,
      updatePasswordAfterRecovery,
      clearLocalAuthSession,
      activateAnonymousScope,
      onLocalAuthSessionClearError,
    } = setup()
    const error = new Error("password update failed")
    updatePasswordAfterRecovery.mockRejectedValue(error)

    await flow.verifyPasswordResetCode("user@example.com", "123456")

    await expect(flow.updatePasswordAfterRecovery("Password1!")).rejects.toBe(error)
    expect(flow.isInProgress()).toBe(true)
    expect(clearLocalAuthSession).not.toHaveBeenCalled()
    expect(activateAnonymousScope).not.toHaveBeenCalled()
    expect(onLocalAuthSessionClearError).not.toHaveBeenCalled()
  })

  it("キャンセル時はセッションを解除して anonymous へ戻る", async () => {
    const { flow, clearLocalAuthSession, activateAnonymousScope } = setup()

    await flow.verifyPasswordResetCode("user@example.com", "123456")
    await flow.cancelPasswordRecovery()

    expect(flow.isInProgress()).toBe(false)
    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
    expect(activateAnonymousScope).toHaveBeenCalledOnce()
  })

  it("recovery が進行中でなければキャンセルしても何もしない", async () => {
    const { flow, clearLocalAuthSession, activateAnonymousScope, onLocalAuthSessionClearError } =
      setup()

    await flow.cancelPasswordRecovery()

    expect(clearLocalAuthSession).not.toHaveBeenCalled()
    expect(activateAnonymousScope).not.toHaveBeenCalled()
    expect(onLocalAuthSessionClearError).not.toHaveBeenCalled()
    expect(flow.isInProgress()).toBe(false)
  })

  it("キャンセル時のセッション解除失敗も通知し anonymous へ戻る", async () => {
    const { flow, clearLocalAuthSession, activateAnonymousScope, onLocalAuthSessionClearError } =
      setup()
    const error = new Error("clear session failed")
    clearLocalAuthSession.mockRejectedValue(error)

    await flow.verifyPasswordResetCode("user@example.com", "123456")
    await flow.cancelPasswordRecovery()

    expect(flow.isInProgress()).toBe(false)
    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
    expect(onLocalAuthSessionClearError).toHaveBeenCalledWith(error, "canceled")
    expect(activateAnonymousScope).toHaveBeenCalledOnce()
  })
})
