import { useActiveQuicklogData } from "@/composables/useActiveQuicklogData"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/storage", () => ({
  loadQuicklogData: vi.fn(),
  saveQuicklogData: vi.fn(),
}))

const emptyData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

const recordedData = {
  version: 3,
  logEntries: [{ id: "id1", text: "text", createdAt: "2026-07-10T00:00:00.000Z" }],
  logEntryDeletions: [],
} satisfies QuicklogData

describe("useActiveQuicklogData", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  function setup(userId: string | undefined) {
    const activeData = useActiveQuicklogData({
      getDataUserId: () => userId,
    })

    return { activeData }
  }

  it("user scope で load するとそのユーザーのデータを要求して返す", () => {
    const { activeData } = setup("user1")
    vi.mocked(loadQuicklogData).mockReturnValue(recordedData)

    const loadedData = activeData.load()

    expect(loadedData).toBe(recordedData)
    expect(loadQuicklogData).toHaveBeenCalledWith("user1")
  })

  it("user scope でデータを set すると data と revision を更新する", () => {
    const { activeData } = setup("user1")

    activeData.set(recordedData)

    expect(activeData.data.value).toEqual(recordedData)
    expect(activeData.revision.value).toBe(1)
  })

  it("user scope でローカル変更するとユーザー別の保存を要求して表示へ反映する", () => {
    const { activeData } = setup("user1")

    activeData.applyLocalChange(recordedData)

    expect(saveQuicklogData).toHaveBeenCalledWith(recordedData, "user1")
    expect(activeData.data.value).toEqual(recordedData)
    expect(activeData.revision.value).toBe(1)
  })

  it("user scope でローカル変更の保存に失敗すると表示と revision を変更しない", () => {
    const { activeData } = setup("user1")
    vi.mocked(saveQuicklogData).mockImplementation(() => {
      throw new Error("save failed")
    })

    expect(() => activeData.applyLocalChange(recordedData)).toThrow("save failed")
    expect(activeData.data.value).toEqual(emptyData)
    expect(activeData.revision.value).toBe(0)
  })

  it("期限切れの削除履歴がある状態で初期化すると整理したデータを保存してから反映する", () => {
    const now = new Date("2026-07-10T00:00:00.000Z")
    const storedData = {
      ...recordedData,
      logEntryDeletions: [{ logEntryId: "expired", createdAt: "2026-01-01T00:00:00.000Z" }],
    } satisfies QuicklogData
    vi.mocked(loadQuicklogData).mockReturnValue(storedData)
    const { activeData } = setup("user1")
    let displayedDataAtSave: QuicklogData | undefined
    vi.mocked(saveQuicklogData).mockImplementation(() => {
      displayedDataAtSave = activeData.data.value
    })

    activeData.initialize(now)

    expect(loadQuicklogData).toHaveBeenCalledExactlyOnceWith("user1")
    expect(saveQuicklogData).toHaveBeenCalledExactlyOnceWith(recordedData, "user1")
    expect(displayedDataAtSave).toEqual(emptyData)
    expect(activeData.data.value).toEqual(recordedData)
    expect(activeData.revision.value).toBe(1)
  })

  it("購読中にローカル変更すると保存・反映した後に通知する", () => {
    const { activeData } = setup("user1")

    const listener = vi.fn(() => {
      expect(activeData.data.value).toEqual(recordedData)
      expect(saveQuicklogData).toHaveBeenCalledWith(recordedData, "user1")
    })

    activeData.subscribeLocalChangeApplied(listener)

    activeData.applyLocalChange(recordedData)

    expect(listener).toHaveBeenCalledOnce()
  })

  it("購読中にローカル変更の保存が失敗すると通知しない", () => {
    vi.mocked(saveQuicklogData).mockImplementation(() => {
      throw new Error("save failed")
    })
    const { activeData } = setup("user1")
    const listener = vi.fn()
    activeData.subscribeLocalChangeApplied(listener)

    expect(() => activeData.applyLocalChange(recordedData)).toThrow("save failed")
    expect(listener).not.toHaveBeenCalled()
  })

  it("購読を解除してローカル変更すると通知しない", () => {
    const { activeData } = setup("user1")
    const listener = vi.fn()
    const unsubscribe = activeData.subscribeLocalChangeApplied(listener)

    unsubscribe()
    activeData.applyLocalChange(recordedData)

    expect(listener).not.toHaveBeenCalled()
  })
})
