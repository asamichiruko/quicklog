import { useCloudSync } from "@/composables/useCloudSync"
import type { CloudSyncContext, CloudSyncQueueOptions } from "@/lib/cloudSyncQueue"
import type { CloudSyncSchedulerOptions } from "@/lib/cloudSyncScheduler"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import type { QuicklogData } from "@/types"
import type { User } from "@supabase/supabase-js"
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"

const emptyData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

const syncedData = {
  version: 3,
  logEntries: [{ id: "id1", text: "text1", createdAt: "2026-07-11T00:00:00.000Z" }],
  logEntryDeletions: [],
} satisfies QuicklogData

const dataSyncResult = {
  addedCount: 1,
  deletedCount: 0,
  uploadedCount: 1,
  data: syncedData,
} satisfies CloudQuicklogDataSyncResult

function createContext(user: User, overrides: Partial<CloudSyncContext> = {}): CloudSyncContext {
  return {
    user,
    data: emptyData,
    dataRevision: 1,
    scopeRevision: 2,
    ...overrides,
  }
}

let queueOptions: CloudSyncQueueOptions
let schedulerOptions: CloudSyncSchedulerOptions<CloudQuicklogDataSyncResult | null>

const mocks = vi.hoisted(() => ({
  queueRequest: vi.fn(),
  schedulerRequestNow: vi.fn(),
  schedulerRequestIfDue: vi.fn(),
  schedulerScheduleAfterLocalChange: vi.fn(),
  schedulerCancelScheduled: vi.fn(),
}))

vi.mock("@/lib/cloudSyncQueue", () => ({
  createCloudSyncQueue: (options: CloudSyncQueueOptions) => {
    queueOptions = options
    return { request: mocks.queueRequest }
  },
}))

vi.mock("@/lib/cloudSyncScheduler", () => ({
  createCloudSyncScheduler: (
    options: CloudSyncSchedulerOptions<CloudQuicklogDataSyncResult | null>,
  ) => {
    schedulerOptions = options
    return {
      scheduleAfterLocalChange: mocks.schedulerScheduleAfterLocalChange,
      requestIfDue: mocks.schedulerRequestIfDue,
      requestNow: mocks.schedulerRequestNow,
      cancelScheduled: mocks.schedulerCancelScheduled,
    }
  },
}))

describe("useCloudSync", () => {
  const wrappers: VueWrapper[] = []

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers.length = 0
    vi.restoreAllMocks()
    vi.resetAllMocks()
  })

  function setup() {
    const user = { id: "user1" } as User

    const getActiveUser = vi.fn((): User | null => user)
    const getData = vi.fn(() => emptyData)
    const getDataRevision = vi.fn(() => 1)
    const getScopeRevision = vi.fn(() => 2)
    const applySyncedData = vi.fn()

    let cloudSync!: ReturnType<typeof useCloudSync>

    const TestComponent = defineComponent({
      setup() {
        cloudSync = useCloudSync({
          getActiveUser,
          getData,
          getDataRevision,
          getScopeRevision,
          applySyncedData,
        })

        return () => null
      },
    })

    const wrapper = mount(TestComponent)
    wrappers.push(wrapper)

    return {
      user,
      getActiveUser,
      getData,
      getDataRevision,
      getScopeRevision,
      applySyncedData,
      cloudSync,
      wrapper,
    }
  }

  it("現在の同期 context を queue へ渡す", () => {
    const { user } = setup()
    const context = queueOptions.getContext()
    const expected = createContext(user)

    expect(context).toEqual(expected)
  })

  it("requestNow が同期結果をそのまま返す", async () => {
    mocks.schedulerRequestNow.mockResolvedValue(dataSyncResult)
    const { cloudSync } = setup()

    await expect(cloudSync.requestNow()).resolves.toBe(dataSyncResult)
  })

  it("requestIfDue が cloudSyncScheduler に転送される", () => {
    const { cloudSync } = setup()

    cloudSync.requestIfDue()

    expect(mocks.schedulerRequestIfDue).toHaveBeenCalledOnce()
  })

  it("scheduleAfterLocalChange が cloudSyncScheduler に転送される", () => {
    const { cloudSync } = setup()

    cloudSync.scheduleAfterLocalChange()

    expect(mocks.schedulerScheduleAfterLocalChange).toHaveBeenCalledOnce()
  })

  it("cancelScheduled が cloudSyncScheduler に転送される", () => {
    const { cloudSync } = setup()

    cloudSync.cancelScheduled()

    expect(mocks.schedulerCancelScheduled).toHaveBeenCalledOnce()
  })

  it("requestNowSilently が同期成功時に警告を出さない", async () => {
    mocks.schedulerRequestNow.mockResolvedValue(dataSyncResult)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { cloudSync } = setup()

    cloudSync.requestNowSilently()
    await flushPromises()
    expect(warn).not.toHaveBeenCalled()

    expect(mocks.schedulerRequestNow).toHaveBeenCalledOnce()
  })

  it("requestNowSilently で呼ばれた requestNow が reject されても未処理のエラーを出さず、警告する", async () => {
    const error = new Error("sync failed")
    mocks.schedulerRequestNow.mockRejectedValue(error)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { cloudSync } = setup()

    cloudSync.requestNowSilently()
    await flushPromises()

    expect(mocks.schedulerRequestNow).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledExactlyOnceWith("Failed to sync quicklog data", error)
  })

  it("applyResult が有効な結果を applySyncedData へ渡す", () => {
    const { user, applySyncedData } = setup()
    const context = createContext(user)

    queueOptions.applyResult(dataSyncResult, context)

    expect(applySyncedData).toHaveBeenCalledExactlyOnceWith(syncedData)
  })

  it("active user がなくなった場合は applyResult が同期結果を適用しない", () => {
    const { user, getActiveUser, applySyncedData } = setup()
    const context = createContext(user)
    getActiveUser.mockReturnValue(null)

    queueOptions.applyResult(dataSyncResult, context)

    expect(mocks.schedulerScheduleAfterLocalChange).not.toHaveBeenCalled()
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("user が異なる場合は applyResult が同期結果を適用しない", () => {
    const { applySyncedData } = setup()
    const wrongUserContext = createContext({ id: "user2" } as User)

    queueOptions.applyResult(dataSyncResult, wrongUserContext)

    expect(mocks.schedulerScheduleAfterLocalChange).not.toHaveBeenCalled()
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("dataRevision が異なる場合は applyResult が再同期を予約する", () => {
    const { user, applySyncedData } = setup()
    const wrongDataRevisionContext = createContext(user, { dataRevision: 2 })

    queueOptions.applyResult(dataSyncResult, wrongDataRevisionContext)

    expect(mocks.schedulerScheduleAfterLocalChange).toHaveBeenCalledOnce()
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("scopeRevision が異なる場合は applyResult が同期結果を適用しない", () => {
    const { user, applySyncedData } = setup()
    const wrongScopeRevisionContext = createContext(user, { scopeRevision: 1 })

    queueOptions.applyResult(dataSyncResult, wrongScopeRevisionContext)

    expect(mocks.schedulerScheduleAfterLocalChange).not.toHaveBeenCalled()
    expect(applySyncedData).not.toHaveBeenCalled()
  })

  it("online になったら同期を要求する", () => {
    setup()

    window.dispatchEvent(new Event("online"))

    expect(mocks.schedulerRequestIfDue).toHaveBeenCalledOnce()
  })

  it("document が visible になったら同期を要求する", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    setup()

    document.dispatchEvent(new Event("visibilitychange"))

    expect(mocks.schedulerRequestIfDue).toHaveBeenCalledOnce()
  })

  it("document が hidden の場合は同期を要求しない", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    setup()

    document.dispatchEvent(new Event("visibilitychange"))

    expect(mocks.schedulerRequestIfDue).not.toHaveBeenCalled()
  })

  it("unmount 時に同期予約を解除する", () => {
    const { wrapper } = setup()

    wrapper.unmount()

    expect(mocks.schedulerCancelScheduled).toHaveBeenCalledOnce()
  })

  it("unmount 後は online イベントで同期を要求しない", () => {
    const { wrapper } = setup()

    wrapper.unmount()
    window.dispatchEvent(new Event("online"))

    expect(mocks.schedulerRequestIfDue).not.toHaveBeenCalled()
  })

  it("canSync が active user の有無を返す", () => {
    const { user, getActiveUser } = setup()
    getActiveUser.mockReturnValue(user)

    expect(schedulerOptions.canSync()).toBe(true)

    getActiveUser.mockReturnValue(null)

    expect(schedulerOptions.canSync()).toBe(false)
  })

  it("requestSync が queue の request を呼ぶ", async () => {
    setup()

    await schedulerOptions.requestSync()

    expect(mocks.queueRequest).toHaveBeenCalledOnce()
  })

  it("onError が警告を出す", () => {
    const error = new Error("sync failed")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    setup()

    const onError = schedulerOptions.onError
    expect(onError).toBeDefined()

    onError?.(error)

    expect(warn).toHaveBeenCalledExactlyOnceWith("Failed to sync quicklog data", error)
  })
})
