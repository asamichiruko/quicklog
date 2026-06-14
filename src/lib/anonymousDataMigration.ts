import { mergeImportedQuicklogData } from "@/lib/quicklogDataMerge"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"

export type MoveAnonymousQuicklogDataToUserResult = {
  data: QuicklogData
  moved: boolean
}

type MoveAnonymousQuicklogDataToUserStorage = {
  loadQuicklogData: typeof loadQuicklogData
  saveQuicklogData: typeof saveQuicklogData
}

const defaultStorage = {
  loadQuicklogData,
  saveQuicklogData,
} satisfies MoveAnonymousQuicklogDataToUserStorage

export function moveAnonymousQuicklogDataToUser(
  userId: string,
  now: Date,
  storage: MoveAnonymousQuicklogDataToUserStorage = defaultStorage,
): MoveAnonymousQuicklogDataToUserResult {
  const anonymousData = storage.loadQuicklogData()
  const userData = storage.loadQuicklogData(userId)

  if (anonymousData.logEntries.length === 0 && anonymousData.logEntryDeletions.length === 0) {
    return { data: userData, moved: false }
  }

  const merged = mergeImportedQuicklogData(userData, anonymousData, now)

  storage.saveQuicklogData(merged.data, userId)
  clearAnonymousQuicklogData(storage)

  return { data: merged.data, moved: true }
}

function clearAnonymousQuicklogData(storage: MoveAnonymousQuicklogDataToUserStorage) {
  storage.saveQuicklogData({
    version: 3,
    logEntries: [],
    logEntryDeletions: [],
  })
}
