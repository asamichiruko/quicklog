import { clearQuicklogData, loadQuicklogData } from "@/lib/storage"
import type { AnonymousDataState, QuicklogData } from "@/types"
import { ref } from "vue"

export function useAnonymousQuicklogData(options: {
  isAnonymousActive: () => boolean
  setActiveQuicklogData: (data: QuicklogData) => void
}) {
  const state = ref<AnonymousDataState>({
    logEntryCount: 0,
    logEntryDeletionCount: 0,
  })

  function refresh() {
    const data = loadQuicklogData()

    state.value = {
      logEntryCount: data.logEntries.length,
      logEntryDeletionCount: data.logEntryDeletions.length,
    }
  }

  function deleteData() {
    clearQuicklogData()

    if (options.isAnonymousActive()) {
      options.setActiveQuicklogData({
        version: 3,
        logEntries: [],
        logEntryDeletions: [],
      })
    }

    refresh()
  }

  return {
    state,
    refresh,
    delete: deleteData,
  }
}
