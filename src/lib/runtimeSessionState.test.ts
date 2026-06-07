import { describe, expect, it } from "vitest"
import { resolveRuntimeSessionState } from "./runtimeSessionState"

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
