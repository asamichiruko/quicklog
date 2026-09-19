import { canUseCloud, resolveObservedSessionState } from "@/lib/runtimeSessionState"
import { resolveSessionTransition, type SessionTransitionEvent } from "@/lib/sessionTransition"
import { loadStoredDataScope, saveStoredDataScope } from "@/lib/storage"
import { type RuntimeSessionState, type DataScope } from "@/types"
import type { Session, User } from "@supabase/supabase-js"
import { readonly, ref } from "vue"

export function useRuntimeSession(options: {
  reloadActiveQuicklogData: () => void
  onStateApplied: (nextState: RuntimeSessionState) => void
}) {
  const session = ref<Session | null>(null)
  const deletedCloudUserIds = new Set<string>()
  const runtimeSessionState = ref<RuntimeSessionState>({
    scope: { type: "anonymous" },
    syncStatus: "disabled",
  })
  const dataScopeRevision = ref(0)

  function isSameDataScope(a: DataScope, b: DataScope) {
    if (a.type !== b.type) return false
    if (a.type === "anonymous" || b.type === "anonymous") return true
    return a.userId === b.userId
  }

  function applySessionTransition(event: SessionTransitionEvent, nextSession: Session | null) {
    const nextState = resolveSessionTransition({
      event,
      storedDataScope: loadStoredDataScope(),
      ignoredUserIds: deletedCloudUserIds,
    })

    applyRuntimeSessionState(nextState, nextSession)
  }

  function applyResolvedSession(nextSession: Session | null) {
    const sessionUserId = nextSession?.user.id ?? null
    const acceptedSession =
      sessionUserId && deletedCloudUserIds.has(sessionUserId) ? null : nextSession

    applySessionTransition({ type: "authResolved", sessionUserId }, acceptedSession)
  }

  function activateAnonymousScope() {
    applySessionTransition({ type: "signedOut" }, null)
  }

  function getActiveCloudUser(): User | null {
    if (session.value && canUseCloud(runtimeSessionState.value, session.value.user.id)) {
      return session.value.user
    } else {
      return null
    }
  }

  function applyDeletedAccount(userId: string) {
    deletedCloudUserIds.add(userId)
    applySessionTransition({ type: "accountDeleted", userId }, null)
  }

  function applyRuntimeSessionState(nextState: RuntimeSessionState, nextSession: Session | null) {
    const previousScope = runtimeSessionState.value.scope

    runtimeSessionState.value = nextState
    session.value = nextSession

    if (!isSameDataScope(previousScope, nextState.scope)) {
      dataScopeRevision.value += 1
    }

    saveStoredDataScope(nextState.scope)
    options.reloadActiveQuicklogData()
    options.onStateApplied(nextState)
  }

  function applyObservedSession(nextSession: Session | null) {
    const resolution = resolveObservedSessionState(
      nextSession?.user.id ?? null,
      loadStoredDataScope(),
    )
    const acceptedSession = resolution.shouldClearSession ? null : nextSession

    applyRuntimeSessionState(resolution.state, acceptedSession)

    return resolution.shouldClearSession
  }

  function commitAuthenticatedSession(nextSession: Session) {
    applyRuntimeSessionState(
      {
        scope: {
          type: "user",
          userId: nextSession.user.id,
        },
        syncStatus: "authenticated",
      },
      nextSession,
    )
  }

  return {
    session,
    runtimeSessionState,
    dataScopeRevision: readonly(dataScopeRevision),
    getActiveCloudUser,
    applySessionTransition,
    applyResolvedSession,
    activateAnonymousScope,
    applyDeletedAccount,
    applyObservedSession,
    commitAuthenticatedSession,
  }
}
