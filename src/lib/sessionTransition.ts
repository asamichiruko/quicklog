import {
  resolvePendingRuntimeSessionState,
  resolveRuntimeSessionState,
} from "@/lib/runtimeSessionState"
import type { DataScope, RuntimeSessionState } from "@/types"

export type SessionTransitionEvent =
  | { type: "startAuthCheck" }
  | { type: "authReloadFailed" }
  | { type: "authCheckTimedOut" }
  | { type: "signedOut" }

export function resolveSessionTransition(options: {
  event: SessionTransitionEvent
  storedDataScope: DataScope
}): RuntimeSessionState {
  const { event, storedDataScope } = options

  switch (event.type) {
    case "startAuthCheck":
      return resolvePendingRuntimeSessionState(storedDataScope)

    case "authReloadFailed":
    case "authCheckTimedOut":
      return resolveRuntimeSessionState(null, storedDataScope)

    case "signedOut":
      return { scope: { type: "anonymous" }, syncStatus: "disabled" }
  }
}
