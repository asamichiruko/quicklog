import { resolveSessionTransition } from "@/lib/sessionTransition"
import { describe, expect, it } from "vitest"

describe("resolveSessionTransition", () => {
  it("保存済みスコープが user のときは認証確認中として扱う", () => {
    expect(
      resolveSessionTransition({
        event: { type: "startAuthCheck" },
        storedDataScope: { type: "user", userId: "userA" },
      }),
    ).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "authPending",
    })
  })

  it("認証確認がタイムアウトしたら保存済み user を sessionLost として扱う", () => {
    expect(
      resolveSessionTransition({
        event: { type: "authCheckTimedOut" },
        storedDataScope: { type: "user", userId: "userA" },
      }),
    ).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "sessionLost",
    })
  })

  it("サインアウトは匿名として扱う", () => {
    const storedDataScope = { type: "user", userId: "userA" } as const

    expect(
      resolveSessionTransition({
        event: { type: "signedOut" },
        storedDataScope,
      }),
    ).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
  })
})
