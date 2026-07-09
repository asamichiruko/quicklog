import { getCurrentSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import { onUnmounted } from "vue"

export function useSupabaseAuthSessionListener(options: {
  shouldIgnoreAuthEvent: () => boolean
  onResolvedSession: (nextSession: Session | null) => void
  onReloadFailed: (error: unknown) => void
}) {
  let unsubscribe: (() => void) | undefined

  function start() {
    if (unsubscribe) return

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (options.shouldIgnoreAuthEvent()) return

      options.onResolvedSession(nextSession)
    })

    unsubscribe = () => {
      data.subscription.unsubscribe()
      unsubscribe = undefined
    }
  }

  function stop() {
    unsubscribe?.()
  }

  async function reload() {
    try {
      options.onResolvedSession(await getCurrentSession())
    } catch (error) {
      options.onReloadFailed(error)
    }
  }

  onUnmounted(stop)

  return {
    start,
    stop,
    reload,
  }
}
