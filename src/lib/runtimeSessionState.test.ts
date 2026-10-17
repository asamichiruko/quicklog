import type { RuntimeSessionState } from "@/types"
import { describe, expect, it } from "vitest"
import {
  canUseCloud,
  getDataUserId,
  isAuthPending,
  resolveObservedSessionState,
  resolvePendingRuntimeSessionState,
  resolveUnavailableRuntimeSessionState,
  syncStatusMessage,
} from "./runtimeSessionState"

describe("resolveObservedSessionState", () => {
  it("anonymous で session が存在しなければ anonymous を維持する", () => {
    const resolution = resolveObservedSessionState(null, { type: "anonymous" })

    expect(resolution).toEqual({
      state: {
        scope: { type: "anonymous" },
        syncStatus: "disabled",
      },
      shouldClearSession: false,
    })
  })

  it("anonymous で session が存在する場合は session を解除対象にする", () => {
    const resolution = resolveObservedSessionState("userA", { type: "anonymous" })

    expect(resolution).toEqual({
      state: {
        scope: { type: "anonymous" },
        syncStatus: "disabled",
      },
      shouldClearSession: true,
    })
  })

  it("保存済みユーザーと session のユーザーが一致すれば authenticated にする", () => {
    const resolution = resolveObservedSessionState("userA", { type: "user", userId: "userA" })

    expect(resolution).toEqual({
      state: {
        scope: { type: "user", userId: "userA" },
        syncStatus: "authenticated",
      },
      shouldClearSession: false,
    })
  })

  it("保存済みユーザーに対する session がなければ sessionLost にする", () => {
    const resolution = resolveObservedSessionState(null, { type: "user", userId: "userA" })

    expect(resolution).toEqual({
      state: {
        scope: { type: "user", userId: "userA" },
        syncStatus: "sessionLost",
      },
      shouldClearSession: false,
    })
  })

  it("保存済みユーザーと異なる session は解除対象にする", () => {
    const resolution = resolveObservedSessionState("userB", { type: "user", userId: "userA" })

    expect(resolution).toEqual({
      state: {
        scope: { type: "user", userId: "userA" },
        syncStatus: "sessionLost",
      },
      shouldClearSession: true,
    })
  })
})

describe("resolvePendingRuntimeSessionState", () => {
  it("storedDataScope が anonymous のときは anonymous を扱う", () => {
    const state = resolvePendingRuntimeSessionState({ type: "anonymous" })

    expect(state).toEqual({
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

describe("resolveUnavailableRuntimeSessionState", () => {
  it("storedDataScope が anonymous のときは disabled とする", () => {
    const state = resolveUnavailableRuntimeSessionState({ type: "anonymous" })

    expect(state).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
  })

  it("storedDataScope が user のときは sessionLost とする", () => {
    const state = resolveUnavailableRuntimeSessionState({ type: "user", userId: "user1" })

    expect(state).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "sessionLost",
    })
  })
})

describe("canUseCloud", () => {
  it("認証済みで session のユーザーがデータ所有者と一致するとクラウド利用を許可する", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "authenticated",
    } satisfies RuntimeSessionState

    const allowed = canUseCloud(state, "userA")

    expect(allowed).toBe(true)
  })

  it("認証済みでも session が別ユーザーならクラウド利用を許可しない", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "authenticated",
    } satisfies RuntimeSessionState

    const allowed = canUseCloud(state, "userB")

    expect(allowed).toBe(false)
  })

  it("認証待ちでは session のユーザーが一致してもクラウド利用を許可しない", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "authPending",
    } satisfies RuntimeSessionState

    const allowed = canUseCloud(state, "userA")

    expect(allowed).toBe(false)
  })

  it("認証喪失中では session のユーザーが一致してもクラウド利用を許可しない", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "sessionLost",
    } satisfies RuntimeSessionState

    const allowed = canUseCloud(state, "userA")

    expect(allowed).toBe(false)
  })

  it("匿名状態では session のユーザーが存在してもクラウド利用を許可しない", () => {
    const state = {
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    } satisfies RuntimeSessionState

    const allowed = canUseCloud(state, "userA")

    expect(allowed).toBe(false)
  })
})

describe("getDataUserId", () => {
  it("匿名状態ではデータ所有者のユーザー ID を返さない", () => {
    const state = {
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    } satisfies RuntimeSessionState

    const userId = getDataUserId(state)

    expect(userId).toBeUndefined()
  })

  it("認証済みではデータ所有者のユーザー ID を返す", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "authenticated",
    } satisfies RuntimeSessionState

    const userId = getDataUserId(state)

    expect(userId).toBe("userA")
  })

  it("認証待ちでもローカルデータを扱うためデータ所有者のユーザー ID を返す", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "authPending",
    } satisfies RuntimeSessionState

    const userId = getDataUserId(state)

    expect(userId).toBe("userA")
  })

  it("認証喪失中でもローカルデータを扱うためデータ所有者のユーザー ID を返す", () => {
    const state = {
      scope: { type: "user", userId: "userA" },
      syncStatus: "sessionLost",
    } satisfies RuntimeSessionState

    const userId = getDataUserId(state)

    expect(userId).toBe("userA")
  })
})
