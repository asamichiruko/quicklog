import { useAnonymousQuicklogData } from "@/composables/useAnonymousQuicklogData"
import { clearQuicklogData, loadQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/storage", () => ({
  loadQuicklogData: vi.fn(),
  clearQuicklogData: vi.fn(),
}))

const emptyData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

const data = {
  version: 3,
  logEntries: [
    { id: "id1", text: "text1", createdAt: "2026-07-11T00:00:00.000Z" },
    { id: "id2", text: "text2", createdAt: "2026-07-11T01:00:00.000Z" },
  ],
  logEntryDeletions: [{ logEntryId: "id3", createdAt: "2026-07-11T02:00:00.000Z" }],
} satisfies QuicklogData

describe("useAnonymousQuicklogData", () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it("初期状態では logEntries, logEntryDeletions の件数が 0", () => {
    const anonymousData = useAnonymousQuicklogData({
      isAnonymousActive: vi.fn(),
      setActiveQuicklogData: vi.fn(),
    })

    expect(anonymousData.state.value.logEntryCount).toBe(0)
    expect(anonymousData.state.value.logEntryDeletionCount).toBe(0)
  })

  it("refresh で anonymous data の件数を反映する", () => {
    vi.mocked(loadQuicklogData).mockReturnValue(data)

    const anonymousData = useAnonymousQuicklogData({
      isAnonymousActive: vi.fn(),
      setActiveQuicklogData: vi.fn(),
    })

    anonymousData.refresh()

    expect(loadQuicklogData).toHaveBeenCalledWith()
    expect(anonymousData.state.value.logEntryCount).toBe(2)
    expect(anonymousData.state.value.logEntryDeletionCount).toBe(1)
  })

  it("delete で削除後の anonymous data の件数を反映する", () => {
    vi.mocked(loadQuicklogData).mockReturnValueOnce(data).mockReturnValueOnce(emptyData)

    const anonymousData = useAnonymousQuicklogData({
      isAnonymousActive: vi.fn(() => false),
      setActiveQuicklogData: vi.fn(),
    })

    anonymousData.refresh()
    expect(anonymousData.state.value).toEqual({
      logEntryCount: 2,
      logEntryDeletionCount: 1,
    })

    anonymousData.delete()

    expect(anonymousData.state.value).toEqual({
      logEntryCount: 0,
      logEntryDeletionCount: 0,
    })
  })

  it("anonymous data が active なら空の QuicklogData を active に反映する", () => {
    vi.mocked(loadQuicklogData).mockReturnValue(emptyData)
    const setActiveQuicklogData = vi.fn()

    const anonymousData = useAnonymousQuicklogData({
      isAnonymousActive: vi.fn(() => true),
      setActiveQuicklogData,
    })

    anonymousData.delete()

    expect(setActiveQuicklogData).toHaveBeenCalledExactlyOnceWith(emptyData)
  })

  it("user data が active なら空の QuicklogData を active に反映しない", () => {
    vi.mocked(loadQuicklogData).mockReturnValue(emptyData)
    const setActiveQuicklogData = vi.fn()

    const anonymousData = useAnonymousQuicklogData({
      isAnonymousActive: vi.fn(() => false),
      setActiveQuicklogData,
    })

    anonymousData.delete()

    expect(setActiveQuicklogData).not.toHaveBeenCalled()
  })

  it("clearQuicklogData が失敗した場合は state の件数と active な QuicklogData を変更しない", () => {
    vi.mocked(loadQuicklogData).mockReturnValueOnce(data)
    const setActiveQuicklogData = vi.fn()

    const anonymousData = useAnonymousQuicklogData({
      isAnonymousActive: vi.fn(() => true),
      setActiveQuicklogData,
    })

    anonymousData.refresh()
    vi.mocked(clearQuicklogData).mockImplementation(() => {
      throw new Error("Clear QuicklogData failed.")
    })

    expect(() => anonymousData.delete()).toThrow("Clear QuicklogData failed.")
    expect(loadQuicklogData).toHaveBeenCalledOnce()
    expect(anonymousData.state.value).toEqual({
      logEntryCount: 2,
      logEntryDeletionCount: 1,
    })
    expect(setActiveQuicklogData).not.toHaveBeenCalled()
  })
})
