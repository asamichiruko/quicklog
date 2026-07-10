import { clearQuicklogData, loadQuicklogData } from "@/lib/storage"
import type { AnonymousDataState, QuicklogData } from "@/types"
import { ref } from "vue"

export function useAnonymousQuicklogData(options: {
  isAnonymousActive: () => boolean
  setActiveQuicklogData: (data: QuicklogData) => void
}) {
  const anonymousQuicklogDataState = ref<AnonymousDataState>({
    logEntryCount: 0,
    logEntryDeletionCount: 0,
  })

  function refreshAnonymousQuicklogDataState() {
    const data = loadQuicklogData()

    anonymousQuicklogDataState.value = {
      logEntryCount: data.logEntries.length,
      logEntryDeletionCount: data.logEntryDeletions.length,
    }
  }

  function deleteAnonymousQuicklogData() {
    clearQuicklogData()

    if (options.isAnonymousActive()) {
      options.setActiveQuicklogData({
        version: 3,
        logEntries: [],
        logEntryDeletions: [],
      })
    }

    refreshAnonymousQuicklogDataState()
  }

  return {
    anonymousQuicklogDataState,
    refreshAnonymousQuicklogDataState,
    deleteAnonymousQuicklogData,
  }
}
