import { describe, expect, it } from "vitest"
import {
  canUseCloud,
  isAuthPending,
  resolveObservedSessionState,
  resolvePendingRuntimeSessionState,
  resolveRuntimeSessionState,
  syncStatusMessage,
} from "./runtimeSessionState"

describe("resolveObservedSessionState", () => {
  it("anonymous で session が存在しなければ anonymous を維持する", () => {
    expect(resolveObservedSessionState(null, { type: "anonymous" })).toEqual({
      state: {
        scope: { type: "anonymous" },
        syncStatus: "disabled",
      },
      shouldClearSession: false,
    })
  })

  it("anonymous で session が存在する場合は session を解除対象にする", () => {
    expect(resolveObservedSessionState("userA", { type: "anonymous" })).toEqual({
      state: {
        scope: { type: "anonymous" },
        syncStatus: "disabled",
      },
      shouldClearSession: true,
    })
  })

  it("保存済みユーザーと session のユーザーが一致すれば authenticated にする", () => {
    expect(resolveObservedSessionState("userA", { type: "user", userId: "userA" })).toEqual({
      state: {
        scope: { type: "user", userId: "userA" },
        syncStatus: "authenticated",
      },
      shouldClearSession: false,
    })
  })

  it("保存済みユーザーに対する session がなければ sessionLost にする", () => {
    expect(resolveObservedSessionState(null, { type: "user", userId: "userA" })).toEqual({
      state: {
        scope: { type: "user", userId: "userA" },
        syncStatus: "sessionLost",
      },
      shouldClearSession: false,
    })
  })

  it("保存済みユーザーと異なる session は解除対象にする", () => {
    expect(resolveObservedSessionState("userB", { type: "user", userId: "userA" })).toEqual({
      state: {
        scope: { type: "user", userId: "userA" },
        syncStatus: "sessionLost",
      },
      shouldClearSession: true,
    })
  })
})

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
