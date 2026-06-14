import { mergeImportedQuicklogData } from "@/lib/quicklogDataMerge"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"

export type MoveAnonymousQuicklogDataToUserResult = {
  data: QuicklogData
  moved: boolean
}

export function moveAnonymousQuicklogDataToUser(
  userId: string,
  now: Date,
): MoveAnonymousQuicklogDataToUserResult {
  const anonymousData = loadQuicklogData()
  const userData = loadQuicklogData(userId)

  if (anonymousData.logEntries.length === 0 && anonymousData.logEntryDeletions.length === 0) {
    return { data: userData, moved: false }
  }

  const merged = mergeImportedQuicklogData(userData, anonymousData, now)

  saveQuicklogData(merged.data, userId)
  clearAnonymousQuicklogData()

  return { data: merged.data, moved: true }
}

function clearAnonymousQuicklogData() {
  saveQuicklogData({
    version: 3,
    logEntries: [],
    logEntryDeletions: [],
  })
}
