import { useCloudSync } from "@/composables/useCloudSync"
import type { CloudSyncContext } from "@/lib/cloudSyncQueue"
import { syncQuicklogDataWithCloud, type CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import type { QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"

// queue / scheduler は実物を使い、通信を伴う同期の境界だけを置き換える。
vi.mock("@/lib/quicklogDataSync", () => ({ syncQuicklogDataWithCloud: vi.fn() }))

const user = { id: "user1" } as User
const localData = { version: 3, logEntries: [], logEntryDeletions: [] } satisfies QuicklogData
const remoteData = {
  version: 3,
  logEntries: [{ id: "remote1", text: "同期した記録", createdAt: "2026-10-14T03:00:00.000Z" }],
  logEntryDeletions: [],
} satisfies QuicklogData
const syncResult = {
  data: remoteData,
  addedCount: 1,
  deletedCount: 0,
  uploadedCount: 0,
} satisfies CloudQuicklogDataSyncResult
const wrappers: VueWrapper[] = []

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function setup(context: CloudSyncContext) {
  const currentContext = { ...context }
  const applySyncedData = vi.fn()
  let cloudSync!: ReturnType<typeof useCloudSync>
  const wrapper = mount(
    defineComponent({
      setup() {
        cloudSync = useCloudSync({
          getActiveUser: () => currentContext.user,
          getData: () => currentContext.data,
          getDataRevision: () => currentContext.dataRevision,
          getScopeRevision: () => currentContext.scopeRevision,
          applySyncedData,
        })
        return () => null
      },
    }),
  )
  wrappers.push(wrapper)
  return { cloudSync, currentContext, applySyncedData, wrapper }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
  vi.setSystemTime(new Date("2026-10-14T03:00:00.000Z"))
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("useCloudSync", () => {
  it("認証済みで即時同期すると現在のユーザーとデータを送信し、結果を返して適用する", async () => {
    vi.mocked(syncQuicklogDataWithCloud).mockResolvedValue(syncResult)
    const { cloudSync, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    const result = await cloudSync.requestNow()

    expect(syncQuicklogDataWithCloud).toHaveBeenCalledExactlyOnceWith(localData, user)
    expect(result).toBe(syncResult)
    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(remoteData)
  })

  it("同期可能なユーザーがなく即時同期すると通信せず null を返す", async () => {
    const { cloudSync, applySyncedData } = setup({
      user: null,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    const result = await cloudSync.requestNow()

    expect(result).toBeNull()
    expect(syncQuicklogDataWithCloud).not.toHaveBeenCalled()
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("同期可能なユーザーがない間は同期せず、ユーザーが復帰すると待たずに同期できる", async () => {
    vi.mocked(syncQuicklogDataWithCloud).mockResolvedValue(syncResult)
    const { cloudSync, currentContext, applySyncedData } = setup({
      user: null,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    cloudSync.requestIfDue()
    cloudSync.scheduleAfterLocalChange()
    await vi.advanceTimersByTimeAsync(1000)

    expect(syncQuicklogDataWithCloud).not.toHaveBeenCalled()

    // ユーザー不在時の要求によって、復帰時の同期が cooldown に阻まれない。
    currentContext.user = user
    cloudSync.requestIfDue()
    await flushPromises()

    expect(syncQuicklogDataWithCloud).toHaveBeenCalledExactlyOnceWith(localData, user)
    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(remoteData)
  })

  it("即時同期の通信が失敗するとエラーを返し、データを適用しない", async () => {
    const failure = new Error("offline")
    vi.mocked(syncQuicklogDataWithCloud).mockRejectedValue(failure)
    const { cloudSync, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    await expect(cloudSync.requestNow()).rejects.toBe(failure)
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("通知なしの即時同期が成功するとデータを適用して警告しない", async () => {
    vi.mocked(syncQuicklogDataWithCloud).mockResolvedValue(syncResult)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { cloudSync, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    cloudSync.requestNowSilently()
    await flushPromises()

    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(remoteData)
    expect(warn).not.toHaveBeenCalled()
  })

  it("通知なしの即時同期が失敗するとエラーを処理して警告する", async () => {
    const failure = new Error("offline")
    vi.mocked(syncQuicklogDataWithCloud).mockRejectedValue(failure)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { cloudSync, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    cloudSync.requestNowSilently()
    await flushPromises()

    expect(warn).toHaveBeenCalledExactlyOnceWith("Failed to sync quicklog data", failure)
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("同期中にユーザーがなくなると返った結果を適用しない", async () => {
    const response = deferred<CloudQuicklogDataSyncResult>()
    vi.mocked(syncQuicklogDataWithCloud).mockReturnValue(response.promise)
    const { cloudSync, currentContext, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    const request = cloudSync.requestNow()
    currentContext.user = null
    response.resolve(syncResult)
    await request
    await vi.advanceTimersByTimeAsync(1000)

    expect(applySyncedData).not.toHaveBeenCalled()
    expect(syncQuicklogDataWithCloud).toHaveBeenCalledOnce()
  })

  it("同期中に別ユーザーへ切り替わると返った結果を適用せず再同期も予約しない", async () => {
    const response = deferred<CloudQuicklogDataSyncResult>()
    vi.mocked(syncQuicklogDataWithCloud).mockReturnValue(response.promise)
    const { cloudSync, currentContext, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    const request = cloudSync.requestNow()
    currentContext.user = { id: "user2" } as User
    response.resolve(syncResult)
    await request
    await vi.advanceTimersByTimeAsync(1000)

    expect(applySyncedData).not.toHaveBeenCalled()
    expect(syncQuicklogDataWithCloud).toHaveBeenCalledOnce()
  })

  it("同期中にローカル revision が変わると古い結果を適用せず最新データで再同期する", async () => {
    const response = deferred<CloudQuicklogDataSyncResult>()
    const editedData = {
      ...localData,
      logEntries: [{ id: "edited1", text: "同期中の記録", createdAt: "2026-10-14T03:00:00.000Z" }],
    }
    vi.mocked(syncQuicklogDataWithCloud)
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(syncResult)
    const { cloudSync, currentContext, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    const request = cloudSync.requestNow()
    currentContext.data = editedData
    currentContext.dataRevision = 2
    response.resolve(syncResult)
    await request

    expect(applySyncedData).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(999)

    expect(syncQuicklogDataWithCloud).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(1)

    expect(syncQuicklogDataWithCloud).toHaveBeenNthCalledWith(2, editedData, user)
    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(remoteData)
  })

  it("同じユーザーでも同期中に scope revision が変わると結果を適用せず再同期も予約しない", async () => {
    const response = deferred<CloudQuicklogDataSyncResult>()
    vi.mocked(syncQuicklogDataWithCloud).mockReturnValue(response.promise)
    const { cloudSync, currentContext, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    const request = cloudSync.requestNow()
    currentContext.scopeRevision = 3
    response.resolve(syncResult)
    await request
    await vi.advanceTimersByTimeAsync(1000)

    expect(applySyncedData).not.toHaveBeenCalled()
    expect(syncQuicklogDataWithCloud).toHaveBeenCalledOnce()
  })

  it("認証済みで online イベントが届くと現在のデータを同期する", async () => {
    vi.mocked(syncQuicklogDataWithCloud).mockResolvedValue(syncResult)
    const { applySyncedData } = setup({ user, data: localData, dataRevision: 1, scopeRevision: 2 })

    window.dispatchEvent(new Event("online"))
    await flushPromises()

    expect(syncQuicklogDataWithCloud).toHaveBeenCalledExactlyOnceWith(localData, user)
    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(remoteData)
  })

  it("認証済みで画面が visible に戻ると現在のデータを同期する", async () => {
    vi.mocked(syncQuicklogDataWithCloud).mockResolvedValue(syncResult)
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    const { applySyncedData } = setup({ user, data: localData, dataRevision: 1, scopeRevision: 2 })

    document.dispatchEvent(new Event("visibilitychange"))
    await flushPromises()

    expect(syncQuicklogDataWithCloud).toHaveBeenCalledExactlyOnceWith(localData, user)
    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(remoteData)
  })

  it("認証済みで画面が hidden になると同期しない", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const { applySyncedData } = setup({ user, data: localData, dataRevision: 1, scopeRevision: 2 })

    document.dispatchEvent(new Event("visibilitychange"))
    await flushPromises()

    expect(syncQuicklogDataWithCloud).not.toHaveBeenCalled()
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("認証済みでローカル変更後に unmount すると予約済みの同期を解除する", async () => {
    const { cloudSync, wrapper } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    cloudSync.scheduleAfterLocalChange()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(1000)

    expect(syncQuicklogDataWithCloud).not.toHaveBeenCalled()
  })

  it("認証済みで unmount 後に online イベントが届いても同期しない", async () => {
    const { wrapper } = setup({ user, data: localData, dataRevision: 1, scopeRevision: 2 })

    wrapper.unmount()
    window.dispatchEvent(new Event("online"))
    await flushPromises()

    expect(syncQuicklogDataWithCloud).not.toHaveBeenCalled()
  })

  it("認証済みで予約した自動同期が失敗するとエラーを処理して警告する", async () => {
    const failure = new Error("offline")
    vi.mocked(syncQuicklogDataWithCloud).mockRejectedValue(failure)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { cloudSync, applySyncedData } = setup({
      user,
      data: localData,
      dataRevision: 1,
      scopeRevision: 2,
    })

    cloudSync.scheduleAfterLocalChange()
    await vi.advanceTimersByTimeAsync(1000)

    expect(warn).toHaveBeenCalledExactlyOnceWith("Failed to sync quicklog data", failure)
    expect(applySyncedData).not.toHaveBeenCalled()
  })
})
