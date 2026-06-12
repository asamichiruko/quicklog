import {
  resolvePendingRuntimeSessionState,
  resolveRuntimeSessionState,
} from "@/lib/runtimeSessionState"
import type { DataScope, RuntimeSessionState } from "@/types"

export type SessionTransitionEvent =
  | { type: "startAuthCheck" }
  | { type: "authResolved"; sessionUserId: string | null }
  | { type: "authReloadFailed" }
  | { type: "authCheckTimedOut" }
  | { type: "signedOut" }
  | { type: "accountDeleted"; userId: string }

export function resolveSessionTransition(options: {
  event: SessionTransitionEvent
  storedDataScope: DataScope
  ignoredUserIds: ReadonlySet<string>
}): RuntimeSessionState {
  const { event, storedDataScope, ignoredUserIds } = options

  switch (event.type) {
    case "startAuthCheck":
      return resolvePendingRuntimeSessionState(storedDataScope)

    case "authResolved":
      if (event.sessionUserId && ignoredUserIds.has(event.sessionUserId)) {
        return { scope: { type: "anonymous" }, syncStatus: "disabled" }
      }

      return resolveRuntimeSessionState(event.sessionUserId, storedDataScope)

    case "authReloadFailed":
    case "authCheckTimedOut":
      return resolveRuntimeSessionState(null, storedDataScope)

    case "signedOut":
    case "accountDeleted":
      return { scope: { type: "anonymous" }, syncStatus: "disabled" }
  }
}
