import { resolveSessionTransition } from "@/lib/sessionTransition"
import { describe, expect, it } from "vitest"

describe("resolveSessionTransition", () => {
  it("保存済みスコープが user のときは認証確認中として扱う", () => {
    expect(
      resolveSessionTransition({
        event: { type: "startAuthCheck" },
        storedDataScope: { type: "user", userId: "userA" },
        ignoredUserIds: new Set(),
      }),
    ).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "authPending",
    })
  })

  it("削除済み user の session は匿名として扱う", () => {
    expect(
      resolveSessionTransition({
        event: { type: "authResolved", sessionUserId: "deletedUser" },
        storedDataScope: { type: "user", userId: "deletedUser" },
        ignoredUserIds: new Set(["deletedUser"]),
      }),
    ).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
  })

  it("認証確認がタイムアウトしたら保存済み user を sessionLost として扱う", () => {
    expect(
      resolveSessionTransition({
        event: { type: "authCheckTimedOut" },
        storedDataScope: { type: "user", userId: "userA" },
        ignoredUserIds: new Set(),
      }),
    ).toEqual({
      scope: { type: "user", userId: "userA" },
      syncStatus: "sessionLost",
    })
  })

  it("サインアウトとアカウント削除は匿名として扱う", () => {
    const storedDataScope = { type: "user", userId: "userA" } as const

    expect(
      resolveSessionTransition({
        event: { type: "signedOut" },
        storedDataScope,
        ignoredUserIds: new Set(),
      }),
    ).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })

    expect(
      resolveSessionTransition({
        event: { type: "accountDeleted", userId: "userA" },
        storedDataScope,
        ignoredUserIds: new Set(),
      }),
    ).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
  })
})
