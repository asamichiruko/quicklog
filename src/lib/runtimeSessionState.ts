import type { DataScope, RuntimeSessionState } from "@/types"

export type ObservedSessionResolution = {
  state: RuntimeSessionState
  shouldClearSession: boolean
}

export function resolveObservedSessionState(
  sessionUserId: string | null,
  storedDataScope: DataScope,
): ObservedSessionResolution {
  if (storedDataScope.type === "anonymous") {
    return {
      state: {
        scope: { type: "anonymous" },
        syncStatus: "disabled",
      },
      shouldClearSession: sessionUserId !== null,
    }
  }

  if (sessionUserId === null) {
    return {
      state: {
        scope: storedDataScope,
        syncStatus: "sessionLost",
      },
      shouldClearSession: false,
    }
  }

  if (sessionUserId !== storedDataScope.userId) {
    return {
      state: {
        scope: storedDataScope,
        syncStatus: "sessionLost",
      },
      shouldClearSession: true,
    }
  }

  return {
    state: {
      scope: storedDataScope,
      syncStatus: "authenticated",
    },
    shouldClearSession: false,
  }
}

export function resolveRuntimeSessionState(
  sessionUserId: string | null,
  storedDataScope: DataScope,
): RuntimeSessionState {
  if (sessionUserId) {
    return { scope: { type: "user", userId: sessionUserId }, syncStatus: "authenticated" }
  }

  if (storedDataScope.type === "anonymous") {
    return { scope: { type: "anonymous" }, syncStatus: "disabled" }
  }

  return { scope: { type: "user", userId: storedDataScope.userId }, syncStatus: "sessionLost" }
}

export function resolvePendingRuntimeSessionState(storedDataScope: DataScope): RuntimeSessionState {
  if (storedDataScope.type === "anonymous") {
    return { scope: { type: "anonymous" }, syncStatus: "disabled" }
  }

  return { scope: { type: "user", userId: storedDataScope.userId }, syncStatus: "authPending" }
}

export function isAuthenticated(runtimeSessionState: RuntimeSessionState) {
  return runtimeSessionState.syncStatus === "authenticated"
}

export function isAuthPending(runtimeSessionState: RuntimeSessionState) {
  return runtimeSessionState.syncStatus === "authPending"
}

export function isSessionLost(runtimeSessionState: RuntimeSessionState) {
  return runtimeSessionState.syncStatus === "sessionLost"
}

export function isAnonymous(runtimeSessionState: RuntimeSessionState) {
  return runtimeSessionState.syncStatus === "disabled"
}

export function getDataUserId(runtimeSessionState: RuntimeSessionState): string | undefined {
  if (runtimeSessionState.scope.type === "anonymous") return undefined
  return runtimeSessionState.scope.userId
}

export function canUseCloud(runtimeSessionState: RuntimeSessionState, sessionUserId: string) {
  return (
    isAuthenticated(runtimeSessionState) && getDataUserId(runtimeSessionState) === sessionUserId
  )
}

export function syncStatusMessage(runtimeSessionState: RuntimeSessionState) {
  if (isAuthenticated(runtimeSessionState)) {
    return "クラウド同期中"
  } else if (isAuthPending(runtimeSessionState)) {
    return "認証確認中"
  } else if (isSessionLost(runtimeSessionState)) {
    return "同期停止中"
  } else {
    return ""
  }
}
