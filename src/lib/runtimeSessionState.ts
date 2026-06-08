import type { DataScope, RuntimeSessionState } from "@/types"

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
