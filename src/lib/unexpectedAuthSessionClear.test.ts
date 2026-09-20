import { createUnexpectedAuthSessionClear } from "@/lib/unexpectedAuthSessionClear"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("createUnexpectedAuthSessionClear", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("要求されたその場では session を clear せず、タイマー後に clear する", async () => {
    const clearLocalAuthSession = vi.fn().mockResolvedValue(undefined)
    const onError = vi.fn()
    const sessionClear = createUnexpectedAuthSessionClear({
      clearLocalAuthSession,
      onError,
    })

    sessionClear.request()

    expect(clearLocalAuthSession).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it("タイマー実行前の重複要求を 1 回にまとめる", async () => {
    const clearLocalAuthSession = vi.fn().mockResolvedValue(undefined)
    const sessionClear = createUnexpectedAuthSessionClear({
      clearLocalAuthSession,
      onError: vi.fn(),
    })

    sessionClear.request()
    sessionClear.request()
    sessionClear.request()

    await vi.runAllTimersAsync()

    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
  })

  it("session の clear 中も重複要求を開始しない", async () => {
    let resolveClear!: () => void
    const clearLocalAuthSession = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClear = resolve
        }),
    )
    const sessionClear = createUnexpectedAuthSessionClear({
      clearLocalAuthSession,
      onError: vi.fn(),
    })

    sessionClear.request()
    await vi.advanceTimersByTimeAsync(0)

    expect(clearLocalAuthSession).toHaveBeenCalledOnce()

    sessionClear.request()

    expect(clearLocalAuthSession).toHaveBeenCalledOnce()

    resolveClear()
    await vi.runAllTimersAsync()
  })

  it("session の clear 完了後は再び要求できる", async () => {
    const clearLocalAuthSession = vi.fn().mockResolvedValue(undefined)
    const sessionClear = createUnexpectedAuthSessionClear({
      clearLocalAuthSession,
      onError: vi.fn(),
    })

    sessionClear.request()
    await vi.runAllTimersAsync()

    sessionClear.request()
    await vi.runAllTimersAsync()

    expect(clearLocalAuthSession).toHaveBeenCalledTimes(2)
  })

  it("session の clear に失敗したら通知し, その後再試行できる", async () => {
    const error = new Error("clear failed")
    const clearLocalAuthSession = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined)
    const onError = vi.fn()
    const sessionClear = createUnexpectedAuthSessionClear({
      clearLocalAuthSession,
      onError,
    })

    sessionClear.request()
    await vi.runAllTimersAsync()

    expect(onError).toHaveBeenCalledExactlyOnceWith(error)

    sessionClear.request()
    await vi.runAllTimersAsync()

    expect(clearLocalAuthSession).toHaveBeenCalledTimes(2)
  })
})
