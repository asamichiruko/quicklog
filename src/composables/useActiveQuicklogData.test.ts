import { useActiveQuicklogData } from "@/composables/useActiveQuicklogData"
import { pruneQuicklogDataLogEntryDeletions } from "@/lib/quicklogDataMerge"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/quicklogDataMerge", () => ({
  pruneQuicklogDataLogEntryDeletions: vi.fn(),
}))

vi.mock("@/lib/storage", () => ({
  loadQuicklogData: vi.fn(),
  saveQuicklogData: vi.fn(),
}))

const emptyData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

const data = {
  version: 3,
  logEntries: [{ id: "id1", text: "text", createdAt: "2026-07-10T00:00:00.000Z" }],
  logEntryDeletions: [],
} satisfies QuicklogData

describe("useActiveQuicklogData", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(loadQuicklogData).mockReturnValue(emptyData)
  })

  function setup(userId: string | undefined = "user1") {
    const scheduleCloudSync = vi.fn()
    const activeData = useActiveQuicklogData({
      getDataUserId: () => userId,
      scheduleCloudSync,
    })

    return { activeData, scheduleCloudSync }
  }

  it("現在のデータスコープから QuicklogData を読み込む", () => {
    const { activeData } = setup()
    vi.mocked(loadQuicklogData).mockReturnValue(data)

    expect(activeData.loadActiveQuicklogData()).toBe(data)
    expect(loadQuicklogData).toHaveBeenCalledWith("user1")
  })

  it("アクティブデータを変更すると quicklogData と revision を更新する", () => {
    const { activeData } = setup()

    activeData.setActiveQuicklogData(data)

    expect(activeData.quicklogData.value).toEqual(data)
    expect(activeData.dataRevision.value).toBe(1)
  })

  it("ローカル変更を保存してから表示へ反映し、クラウド同期を予約する", () => {
    const { activeData, scheduleCloudSync } = setup()

    activeData.applyLocalQuicklogDataChange(data)

    expect(saveQuicklogData).toHaveBeenCalledWith(data, "user1")
    expect(activeData.quicklogData.value).toEqual(data)
    expect(activeData.dataRevision.value).toBe(1)
    expect(scheduleCloudSync).toHaveBeenCalledOnce()
  })

  it("ローカル変更の保存に失敗した場合は表示と revision を変更せず、同期も予約しない", () => {
    const { activeData, scheduleCloudSync } = setup()
    vi.mocked(saveQuicklogData).mockImplementation(() => {
      throw new Error("save failed")
    })

    expect(() => activeData.applyLocalQuicklogDataChange(data)).toThrow("save failed")
    expect(activeData.quicklogData.value).toEqual(emptyData)
    expect(activeData.dataRevision.value).toBe(0)
    expect(scheduleCloudSync).not.toHaveBeenCalled()
  })

  it("削除履歴を整理したデータを保存してからアクティブデータへ反映する", () => {
    const { activeData } = setup()
    const now = new Date("2026-07-10T00:00:00.000Z")
    vi.mocked(pruneQuicklogDataLogEntryDeletions).mockReturnValue(data)

    activeData.initializeActiveQuicklogData(now)

    expect(pruneQuicklogDataLogEntryDeletions).toHaveBeenCalledWith(emptyData, now)
    expect(saveQuicklogData).toHaveBeenCalledWith(data, "user1")
    expect(activeData.quicklogData.value).toEqual(data)
    expect(activeData.dataRevision.value).toBe(1)
  })
})
