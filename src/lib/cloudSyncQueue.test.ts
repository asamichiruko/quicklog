import { describe, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"
import type { QuicklogData } from "@/types"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import { createCloudSyncQueue, type CloudSyncContext } from "./cloudSyncQueue"

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

function createQuicklogData(id: string): QuicklogData {
  return {
    version: 3,
    logEntries: [{ id, text: id, createdAt: "2026-06-08T00:00:00.000Z" }],
    logEntryDeletions: [],
  }
}

function createResult(data: QuicklogData): CloudQuicklogDataSyncResult {
  return {
    data,
    addedCount: data.logEntries.length,
    deletedCount: 0,
    uploadedCount: data.logEntries.length,
  }
}

const user = { id: "user1" } as User

function createContext(
  data: QuicklogData,
  overrides: Partial<CloudSyncContext> = {},
): CloudSyncContext {
  return {
    user,
    data,
    dataRevision: 1,
    scopeRevision: 1,
    ...overrides,
  }
}

describe("createCloudSyncQueue", () => {
  it("user がないときは同期しない", async () => {
    const sync = vi.fn()
    const applyResult = vi.fn()
    const queue = createCloudSyncQueue({
      getContext: () => createContext(createQuicklogData("local"), { user: null }),
      sync,
      applyResult,
    })

    await expect(queue.request()).resolves.toBeNull()
    expect(sync).not.toHaveBeenCalled()
    expect(applyResult).not.toHaveBeenCalled()
  })

  it("同期中の request は同じ promise に合流し、完了後にもう一度同期する", async () => {
    const firstDeferred = createDeferred<CloudQuicklogDataSyncResult>()
    const firstData = createQuicklogData("first")
    const secondData = createQuicklogData("second")
    const firstResult = createResult(firstData)
    const secondResult = createResult(secondData)
    let currentContext = createContext(firstData, { dataRevision: 1 })
    const sync = vi
      .fn()
      .mockImplementationOnce(() => {
        currentContext = createContext(secondData, { dataRevision: 2 })
        return firstDeferred.promise
      })
      .mockResolvedValueOnce(secondResult)
    const applyResult = vi.fn()
    const queue = createCloudSyncQueue({
      getContext: () => currentContext,
      sync,
      applyResult,
    })

    const firstRequest = queue.request()
    await vi.waitFor(() => expect(sync).toHaveBeenCalledTimes(1))

    const secondRequest = queue.request()

    expect(secondRequest).toBe(firstRequest)
    expect(sync).toHaveBeenCalledTimes(1)

    firstDeferred.resolve(firstResult)

    await expect(firstRequest).resolves.toBe(secondResult)
    await expect(secondRequest).resolves.toBe(secondResult)
    expect(sync).toHaveBeenCalledTimes(2)
    expect(applyResult).toHaveBeenCalledWith(
      firstResult,
      createContext(firstData, { dataRevision: 1 }),
    )
    expect(applyResult).toHaveBeenCalledWith(
      secondResult,
      createContext(secondData, { dataRevision: 2 }),
    )
  })

  it("result 適用時に同期開始時点の context を渡す", async () => {
    const data = createQuicklogData("local")
    const result = createResult(createQuicklogData("merged"))
    const context = createContext(data, { dataRevision: 3, scopeRevision: 4 })
    const applyResult = vi.fn()
    const queue = createCloudSyncQueue({
      getContext: () => context,
      sync: vi.fn().mockResolvedValue(result),
      applyResult,
    })

    await queue.request()

    expect(applyResult).toHaveBeenCalledWith(result, context)
  })

  it("sync が失敗しても次回 request できる", async () => {
    const data = createQuicklogData("local")
    const result = createResult(createQuicklogData("merged"))
    const error = new Error("network error")
    const onError = vi.fn()
    const sync = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(result)
    const queue = createCloudSyncQueue({
      getContext: () => createContext(data),
      sync,
      applyResult: vi.fn(),
      onError,
    })

    await expect(queue.request()).rejects.toThrow(error)
    await expect(queue.request()).resolves.toBe(result)
    expect(sync).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it("sync が失敗したら result を適用しない", async () => {
    const data = createQuicklogData("local")
    const error = new Error("network error")
    const onError = vi.fn()
    const sync = vi.fn().mockRejectedValue(error)
    const applyResult = vi.fn()
    const queue = createCloudSyncQueue({
      getContext: () => createContext(data),
      sync,
      applyResult,
      onError,
    })

    await expect(queue.request()).rejects.toThrow(error)
    expect(applyResult).not.toHaveBeenCalled()
  })
})
