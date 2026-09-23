import { pruneQuicklogDataLogEntryDeletions } from "@/lib/quicklogDataMerge"
import { loadQuicklogData, saveQuicklogData } from "@/lib/storage"
import type { QuicklogData } from "@/types"
import { readonly, ref } from "vue"

type LocalChangeAppliedListener = () => void

export function useActiveQuicklogData(options: { getDataUserId: () => string | undefined }) {
  const localChangeAppliedListeners = new Set<LocalChangeAppliedListener>()
  const data = ref<QuicklogData>({
    version: 3,
    logEntries: [],
    logEntryDeletions: [],
  })
  const revision = ref(0)

  function subscribeLocalChangeApplied(listener: LocalChangeAppliedListener) {
    localChangeAppliedListeners.add(listener)
    return () => {
      localChangeAppliedListeners.delete(listener)
    }
  }

  function load(): QuicklogData {
    return loadQuicklogData(options.getDataUserId())
  }

  function save(data: QuicklogData) {
    saveQuicklogData(data, options.getDataUserId())
  }

  function set(nextData: QuicklogData) {
    data.value = nextData
    revision.value += 1
  }

  function initialize(now: Date) {
    const pruned = pruneQuicklogDataLogEntryDeletions(load(), now)
    save(pruned)
    set(pruned)
  }

  function applyLocalChange(nextData: QuicklogData) {
    save(nextData)
    set(nextData)

    for (const listener of [...localChangeAppliedListeners]) {
      listener()
    }
  }

  return {
    data,
    revision: readonly(revision),
    load,
    save,
    set,
    initialize,
    applyLocalChange,
    subscribeLocalChangeApplied,
  }
}
