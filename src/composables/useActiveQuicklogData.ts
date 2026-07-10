import { pruneQuicklogDataLogEntryDeletions } from "@/lib/quicklogDataMerge"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"
import { readonly, ref } from "vue"

export function useActiveQuicklogData(options: {
  getDataUserId: () => string | undefined
  scheduleCloudSync: () => void
}) {
  const quicklogData = ref<QuicklogData>({
    version: 3,
    logEntries: [],
    logEntryDeletions: [],
  })
  const dataRevision = ref(0)

  function loadActiveQuicklogData(): QuicklogData {
    return loadQuicklogData(options.getDataUserId())
  }

  function saveActiveQuicklogData(data: QuicklogData) {
    saveQuicklogData(data, options.getDataUserId())
  }

  function setActiveQuicklogData(nextData: QuicklogData) {
    quicklogData.value = nextData
    dataRevision.value += 1
  }

  function pruneActiveQuicklogData(now: Date) {
    const pruned = pruneQuicklogDataLogEntryDeletions(loadActiveQuicklogData(), now)
    saveActiveQuicklogData(pruned)
    setActiveQuicklogData(pruned)
  }

  function applyLocalQuicklogDataChange(nextData: QuicklogData) {
    saveActiveQuicklogData(nextData)
    setActiveQuicklogData(nextData)
    options.scheduleCloudSync()
  }

  return {
    quicklogData,
    dataRevision: readonly(dataRevision),
    setActiveQuicklogData,
    loadActiveQuicklogData,
    saveActiveQuicklogData,
    pruneActiveQuicklogData,
    applyLocalQuicklogDataChange,
  }
}
