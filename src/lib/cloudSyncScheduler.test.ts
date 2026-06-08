import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCloudSyncScheduler } from "./cloudSyncScheduler"

describe("createCloudSyncScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("local change 後に delay して request する", async () => {
    const requestSync = vi.fn().mockResolvedValue(null)

    const scheduler = createCloudSyncScheduler({
      canSync: () => true,
      requestSync,
      autoSyncDelayMs: 5000,
    })

    scheduler.scheduleAfterLocalChange()

    expect(requestSync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(4999)
    expect(requestSync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(requestSync).toHaveBeenCalledOnce()
  })

  it("local change が連続したら最後の delay まで request しない", async () => {
    const requestSync = vi.fn().mockResolvedValue(null)

    const scheduler = createCloudSyncScheduler({
      canSync: () => true,
      requestSync,
      autoSyncDelayMs: 5000,
    })

    scheduler.scheduleAfterLocalChange()

    await vi.advanceTimersByTimeAsync(4000)
    scheduler.scheduleAfterLocalChange()

    await vi.advanceTimersByTimeAsync(4999)
    expect(requestSync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(requestSync).toHaveBeenCalledOnce()
  })

  it("cooldown 中は requestIfDue() しても request しない", () => {
    vi.setSystemTime(new Date("2026-06-08T00:00:00.000Z"))

    const requestSync = vi.fn().mockResolvedValue(null)
    const scheduler = createCloudSyncScheduler({
      canSync: () => true,
      requestSync,
      cooldownMs: 60_000,
    })

    scheduler.requestIfDue()
    expect(requestSync).toHaveBeenCalledOnce()

    vi.setSystemTime(new Date("2026-06-08T00:00:59.999Z"))
    scheduler.requestIfDue()
    expect(requestSync).toHaveBeenCalledOnce()

    vi.setSystemTime(new Date("2026-06-08T00:01:00.000Z"))
    scheduler.requestIfDue()
    expect(requestSync).toHaveBeenCalledTimes(2)
  })

  it("requestNow() は scheduled sync を cancel して即 request する", async () => {
    const result = { oke: true }
    const requestSync = vi.fn().mockResolvedValue(result)

    const scheduler = createCloudSyncScheduler({
      canSync: () => true,
      requestSync,
      autoSyncDelayMs: 5000,
    })

    scheduler.scheduleAfterLocalChange()

    await vi.advanceTimersByTimeAsync(4000)
    expect(requestSync).not.toHaveBeenCalled()

    await expect(scheduler.requestNow()).resolves.toBe(result)
    expect(requestSync).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(4000)
    expect(requestSync).toHaveBeenCalledOnce()
  })
})
