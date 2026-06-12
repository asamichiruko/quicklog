import { moveAnonymousQuicklogDataToUser } from "@/lib/quicklogDataScopeMigration"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"
import { beforeEach, describe, expect, it } from "vitest"

const emptyData = {
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
} satisfies QuicklogData

const anonymousData = {
  version: 3,
  logEntries: [{ id: "id1", text: "anonymousData1", createdAt: "2026-06-10T00:00:00.000Z" }],
  logEntryDeletions: [{ logEntryId: "id2", createdAt: "2026-06-10T03:00:00.000Z" }],
} satisfies QuicklogData

const userData = {
  version: 3,
  logEntries: [
    { id: "id3", text: "userData1", createdAt: "2026-06-10T01:00:00.000Z" },
    { id: "id2", text: "userData2", createdAt: "2026-06-10T02:00:00.000Z" },
  ],
  logEntryDeletions: [{ logEntryId: "id4", createdAt: "2026-06-10T04:00:00.000Z" }],
} satisfies QuicklogData

const mergedData = {
  version: 3,
  logEntries: [anonymousData.logEntries[0], userData.logEntries[0]],
  logEntryDeletions: [userData.logEntryDeletions[0], anonymousData.logEntryDeletions[0]],
} satisfies QuicklogData

describe("moveAnonymousQuicklogDataToUser", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("anonymous data が空の場合は user data を返す", () => {
    saveQuicklogData(userData, "user1")

    const result = moveAnonymousQuicklogDataToUser("user1", new Date("2026-06-10T02:00:00.000Z"))

    expect(result.data).toEqual(userData)
    expect(result.moved).toBe(false)
    expect(loadQuicklogData()).toEqual(emptyData)
    expect(loadQuicklogData("user1")).toEqual(userData)
  })

  it("anonymous data が存在する場合は user data に移行する", () => {
    saveQuicklogData(anonymousData)
    saveQuicklogData(userData, "user1")

    const result = moveAnonymousQuicklogDataToUser("user1", new Date("2026-06-10T02:00:00.000Z"))

    expect(result.data).toEqual(mergedData)
    expect(result.moved).toBe(true)
    expect(loadQuicklogData()).toEqual(emptyData)
    expect(loadQuicklogData("user1")).toEqual(mergedData)
  })
})
