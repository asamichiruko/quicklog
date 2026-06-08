import { describe, expect, it } from "vitest"
import {
  canUseCloud,
  isAuthPending,
  resolvePendingRuntimeSessionState,
  resolveRuntimeSessionState,
  syncStatusMessage,
} from "./runtimeSessionState"

describe("resolveRuntimeSessionState", () => {
  it("session があるときは session の user を authenticated として扱う", () => {
    expect(resolveRuntimeSessionState("userA", { type: "anonymous" })).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "authenticated",
    })
  })

  it("session があるときは storedDataScope の user より session の user を優先する", () => {
    expect(resolveRuntimeSessionState("userB", { type: "user", userId: "userA" })).toEqual({
      scope: { type: "user", userId: "userB" },
      syncStatus: "authenticated",
    })
  })

  it("session がなく storedDataScope が anonymous のときは anonymous を扱う", () => {
    expect(resolveRuntimeSessionState(null, { type: "anonymous" })).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
  })

  it("session がなく storedDataScope が user のときは sessionLost として user data を扱う", () => {
    expect(resolveRuntimeSessionState(null, { type: "user", userId: "userA" })).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "sessionLost",
    })
  })
})

describe("resolvePendingRuntimeSessionState", () => {
  it("storedDataScope が anonymous のときは anonymous を扱う", () => {
    expect(resolvePendingRuntimeSessionState({ type: "anonymous" })).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
  })

  it("storedDataScope が user のときは authPending として user data を扱う", () => {
    const state = resolvePendingRuntimeSessionState({ type: "user", userId: "userA" })

    expect(state).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "authPending",
    })
    expect(isAuthPending(state)).toBe(true)
    expect(canUseCloud(state, "userA")).toBe(false)
    expect(syncStatusMessage(state)).toBe("認証確認中")
  })
})
