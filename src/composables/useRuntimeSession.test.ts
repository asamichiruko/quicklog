import { useRuntimeSession } from "@/composables/useRuntimeSession"
import { loadStoredDataScope, saveStoredDataScope } from "@/lib/storage"
import type { DataScope } from "@/types"
import type { Session } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/storage", () => ({
  loadStoredDataScope: vi.fn(),
  saveStoredDataScope: vi.fn(),
}))

function createSession(userId: string) {
  return { user: { id: userId } } as Session
}

describe("useRuntimeSession", () => {
  let storedScope: DataScope

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(loadStoredDataScope).mockImplementation(() => storedScope)
    vi.mocked(saveStoredDataScope).mockImplementation((scope) => {
      storedScope = scope
    })
  })

  it("初期状態は anonymous で session がない", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(0)
  })

  it("anonymous から anonymous への遷移では dataScopeRevision が増えない", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.activateAnonymousScope()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(0)
  })

  it("user から anonymous への遷移で dataScopeRevision が増える", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)
    expect(runtimeSession.session.value).not.toBeNull()
    expect(storedScope).toEqual({ type: "user", userId: "user1" })

    runtimeSession.activateAnonymousScope()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(2)
    expect(storedScope).toEqual({ type: "anonymous" })
  })

  it("anonymous から user への遷移では dataScopeRevision が増える", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)
  })

  it("同じユーザーの session を更新すると session を置き換え、revision は増やさない", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const previousSession = { ...createSession("user1"), access_token: "previous-token" }
    const refreshedSession = { ...createSession("user1"), access_token: "refreshed-token" }
    runtimeSession.commitAuthenticatedSession(previousSession)

    expect(runtimeSession.session.value).toEqual(previousSession)
    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    runtimeSession.commitAuthenticatedSession(refreshedSession)

    expect(runtimeSession.session.value).toEqual(refreshedSession)
    expect(runtimeSession.dataScopeRevision.value).toBe(1)
  })

  it("同じユーザーに戻っても途中で匿名へ切り替えていれば revision が更新される", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const session = createSession("user1")
    runtimeSession.commitAuthenticatedSession(session)

    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    runtimeSession.activateAnonymousScope()

    expect(runtimeSession.dataScopeRevision.value).toBe(2)

    runtimeSession.commitAuthenticatedSession(session)

    expect(runtimeSession.session.value).toEqual(session)
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(3)
  })

  it("遷移した session と RuntimeSessionState を反映する", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const nextSession = createSession("user1")

    runtimeSession.commitAuthenticatedSession(nextSession)

    expect(runtimeSession.session.value).toEqual(nextSession)
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    })
  })

  it("匿名状態で session を確定すると、そのユーザーの scope を保存する", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(storedScope).toEqual({ type: "user", userId: "user1" })
  })

  it("authenticated な現在の session user だけを active cloud user として返す", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const nextSession = createSession("user1")

    expect(runtimeSession.getActiveCloudUser()).toBeNull()

    runtimeSession.commitAuthenticatedSession(nextSession)

    expect(runtimeSession.getActiveCloudUser()).toEqual(nextSession.user)

    runtimeSession.activateAnonymousScope()

    expect(runtimeSession.getActiveCloudUser()).toBeNull()
  })

  it("user から匿名へ切り替えた後に元の session を観測しても受理しない", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))
    runtimeSession.activateAnonymousScope()

    expect(storedScope).toEqual({ type: "anonymous" })

    const shouldClearSession = runtimeSession.applyObservedSession(createSession("user1"))

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(runtimeSession.getActiveCloudUser()).toBeNull()
    expect(shouldClearSession).toBe(true)
  })

  it("anonymous scope のとき null session が観測されたら受理する", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()

    const shouldClearSession = runtimeSession.applyObservedSession(null)

    expect(shouldClearSession).toBe(false)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(storedScope).toEqual({ type: "anonymous" })
  })

  it("anonymous scope のとき user session が観測されても受理しない", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const nextSession = createSession("user1")

    const shouldClearSession = runtimeSession.applyObservedSession(nextSession)

    expect(shouldClearSession).toBe(true)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(storedScope).toEqual({ type: "anonymous" })
  })

  it("user scope のとき null session が観測されたら受理して sessionLost とする", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()

    const shouldClearSession = runtimeSession.applyObservedSession(null)

    expect(shouldClearSession).toBe(false)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "sessionLost",
    })
    expect(storedScope).toEqual({ type: "user", userId: "user1" })
  })

  it("user scope のとき同じ user の session が観測されたら受理する", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()
    const nextSession = createSession("user1")

    const shouldClearSession = runtimeSession.applyObservedSession(nextSession)

    expect(shouldClearSession).toBe(false)
    expect(runtimeSession.session.value).toEqual(nextSession)
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: {
        type: "user",
        userId: "user1",
      },
      syncStatus: "authenticated",
    })
    expect(storedScope).toEqual({ type: "user", userId: "user1" })
  })

  it("user scope のとき異なる user の session が観測されたら受理せず sessionLost とする", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()
    const nextSession = createSession("user2")

    const shouldClearSession = runtimeSession.applyObservedSession(nextSession)

    expect(shouldClearSession).toBe(true)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: {
        type: "user",
        userId: "user1",
      },
      syncStatus: "sessionLost",
    })
    expect(storedScope).toEqual({ type: "user", userId: "user1" })
  })

  it("別ユーザーの session を確定すると受理して scope と revision を更新する", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const previousSession = createSession("user1")
    const nextSession = createSession("user2")

    runtimeSession.commitAuthenticatedSession(previousSession)

    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    runtimeSession.commitAuthenticatedSession(nextSession)

    expect(runtimeSession.session.value).toEqual(nextSession)
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: {
        type: "user",
        userId: "user2",
      },
      syncStatus: "authenticated",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(2)
  })

  it("保存済みの user scope から初期化すると authPending 状態に移る", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.initialize()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: {
        type: "user",
        userId: "user1",
      },
      syncStatus: "authPending",
    })
  })

  it("user scope のとき applyAuthUnavailable で sessionLost 状態に移る", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()

    runtimeSession.applyAuthUnavailable()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: {
        type: "user",
        userId: "user1",
      },
      syncStatus: "sessionLost",
    })
  })

  it("認証済みで認証を利用不可にすると session を消去し、データ scope と revision を維持する", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()
    const session = createSession("user1")
    runtimeSession.commitAuthenticatedSession(session)

    expect(runtimeSession.getActiveCloudUser()).toEqual(session.user)
    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    runtimeSession.applyAuthUnavailable()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.getActiveCloudUser()).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "sessionLost",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(1)
    expect(storedScope).toEqual({ type: "user", userId: "user1" })
  })

  it("認証待ちから同一ユーザーの session を受理・喪失・再受理しても revision は増えない", () => {
    storedScope = { type: "user", userId: "user1" }
    const runtimeSession = useRuntimeSession()
    const session = createSession("user1")

    runtimeSession.initialize()

    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authPending",
    })
    expect(runtimeSession.getActiveCloudUser()).toBeNull()
    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    const shouldClearAcceptedSession = runtimeSession.applyObservedSession(session)

    expect(shouldClearAcceptedSession).toBe(false)
    expect(runtimeSession.getActiveCloudUser()).toEqual(session.user)
    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    const shouldClearMissingSession = runtimeSession.applyObservedSession(null)

    expect(shouldClearMissingSession).toBe(false)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.getActiveCloudUser()).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "sessionLost",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    const shouldClearRestoredSession = runtimeSession.applyObservedSession(session)

    expect(shouldClearRestoredSession).toBe(false)
    expect(runtimeSession.session.value).toEqual(session)
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    })
    expect(runtimeSession.getActiveCloudUser()).toEqual(session.user)
    expect(runtimeSession.dataScopeRevision.value).toBe(1)
    expect(storedScope).toEqual({ type: "user", userId: "user1" })
  })

  it("状態適用後に購読者へ適用済み状態を通知する", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const listener = vi.fn()
    runtimeSession.subscribeStateApplied(listener)

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(listener).toHaveBeenCalledExactlyOnceWith({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    })
  })

  it("状態と scope を保存してから購読者へ通知する", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const session = createSession("user1")

    const listener = vi.fn(() => {
      expect(runtimeSession.session.value).toEqual(session)
      expect(runtimeSession.runtimeSessionState.value).toEqual({
        scope: { type: "user", userId: "user1" },
        syncStatus: "authenticated",
      })
      expect(runtimeSession.dataScopeRevision.value).toBe(1)
      expect(storedScope).toEqual({ type: "user", userId: "user1" })
    })

    runtimeSession.subscribeStateApplied(listener)

    runtimeSession.commitAuthenticatedSession(session)

    expect(listener).toHaveBeenCalledOnce()
  })

  it("購読解除後は状態適用を通知しない", () => {
    storedScope = { type: "anonymous" }
    const runtimeSession = useRuntimeSession()
    const listener = vi.fn()
    const unsubscribe = runtimeSession.subscribeStateApplied(listener)

    unsubscribe()
    runtimeSession.initialize()
    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    })
    expect(listener).not.toHaveBeenCalled()
  })
})
