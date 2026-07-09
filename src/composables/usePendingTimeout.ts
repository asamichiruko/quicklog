import { onUnmounted } from "vue"

export function usePendingTimeout(options: {
  timeoutMs: number
  isPending: () => boolean
  onTimedOut: () => void
}) {
  let timeoutId: ReturnType<typeof window.setTimeout> | undefined

  function schedule() {
    clear()

    if (!options.isPending()) return

    timeoutId = window.setTimeout(() => {
      timeoutId = undefined

      if (!options.isPending()) return

      options.onTimedOut()
    }, options.timeoutMs)
  }

  function clear() {
    if (timeoutId === undefined) return

    window.clearTimeout(timeoutId)
    timeoutId = undefined
  }

  onUnmounted(clear)

  return {
    schedule,
    clear,
  }
}
