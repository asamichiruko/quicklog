import { useRuntimeSession } from "@/composables/useRuntimeSession"
import { loadStoredDataScope, saveStoredDataScope } from "@/lib/storage"
import type { DataScope, RuntimeSessionState } from "@/types"
import type { Session } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/storage", () => ({
  loadStoredDataScope: vi.fn(),
  saveStoredDataScope: vi.fn(),
}))

const anonymousScope = { type: "anonymous" } satisfies DataScope
const anonymousState = {
  scope: anonymousScope,
  syncStatus: "disabled",
} satisfies RuntimeSessionState

function createSession(userId: string) {
  return { user: { id: userId } } as Session
}

describe("useRuntimeSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(loadStoredDataScope).mockReturnValue(anonymousScope)
  })

  function setup() {
    const reloadActiveQuicklogData = vi.fn()
    const onStateApplied = vi.fn()
    const runtimeSession = useRuntimeSession({
      reloadActiveQuicklogData,
      onStateApplied,
    })

    return { runtimeSession, reloadActiveQuicklogData, onStateApplied }
  }

  it("初期状態は anonymous で session がない", () => {
    const { runtimeSession } = setup()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual(anonymousState)
    expect(runtimeSession.dataScopeRevision.value).toBe(0)
  })

  it("anonymous から anonymous への遷移では dataScopeRevision が増えない", () => {
    const { runtimeSession } = setup()

    runtimeSession.activateAnonymousScope()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(0)
  })

  it("user から anonymous への遷移で dataScopeRevision が増える", () => {
    const { runtimeSession } = setup()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)
    expect(runtimeSession.session.value).not.toBeNull()

    runtimeSession.activateAnonymousScope()

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    expect(runtimeSession.dataScopeRevision.value).toBe(2)
  })

  it("anonymous から user への遷移では dataScopeRevision が増える", () => {
    const { runtimeSession } = setup()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)
  })

  it("user から同じ user への遷移では dataScopeRevision が増えない", () => {
    const { runtimeSession } = setup()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)
  })

  it("user から異なる user への遷移では dataScopeRevision が増える", () => {
    const { runtimeSession } = setup()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(runtimeSession.dataScopeRevision.value).toBe(1)

    runtimeSession.commitAuthenticatedSession(createSession("user2"))

    expect(runtimeSession.dataScopeRevision.value).toBe(2)
  })

  it("遷移した session と RuntimeSessionState を反映する", () => {
    const { runtimeSession } = setup()
    const nextSession = createSession("user1")

    runtimeSession.commitAuthenticatedSession(nextSession)

    expect(runtimeSession.session.value).toEqual(nextSession)
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    })
  })

  it("遷移後の scope を保存してから active data を再読込し、適用済み状態を通知する", () => {
    const { runtimeSession, reloadActiveQuicklogData, onStateApplied } = setup()
    const expectedState = {
      scope: { type: "user", userId: "user1" },
      syncStatus: "authenticated",
    } satisfies RuntimeSessionState

    reloadActiveQuicklogData.mockImplementation(() => {
      expect(runtimeSession.runtimeSessionState.value).toEqual(expectedState)
    })

    runtimeSession.commitAuthenticatedSession(createSession("user1"))

    expect(saveStoredDataScope).toHaveBeenCalledExactlyOnceWith(expectedState.scope)
    expect(reloadActiveQuicklogData).toHaveBeenCalledOnce()
    expect(onStateApplied).toHaveBeenCalledExactlyOnceWith(expectedState)
    expect(vi.mocked(saveStoredDataScope).mock.invocationCallOrder[0]).toBeLessThan(
      reloadActiveQuicklogData.mock.invocationCallOrder[0]!,
    )
    expect(reloadActiveQuicklogData.mock.invocationCallOrder[0]).toBeLessThan(
      onStateApplied.mock.invocationCallOrder[0]!,
    )
  })

  it("authenticated な現在の session user だけを active cloud user として返す", () => {
    const { runtimeSession } = setup()
    const nextSession = createSession("user1")

    expect(runtimeSession.getActiveCloudUser()).toBeNull()

    runtimeSession.commitAuthenticatedSession(nextSession)
    expect(runtimeSession.getActiveCloudUser()).toEqual(nextSession.user)

    runtimeSession.activateAnonymousScope()
    expect(runtimeSession.getActiveCloudUser()).toBeNull()
  })

  it("削除したアカウントの session が後から届いても受理しない", () => {
    const { runtimeSession } = setup()

    runtimeSession.commitAuthenticatedSession(createSession("user1"))
    runtimeSession.activateAnonymousScope()
    const shouldClearSession = runtimeSession.applyObservedSession(createSession("user1"))

    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual(anonymousState)
    expect(runtimeSession.getActiveCloudUser()).toBeNull()
    expect(shouldClearSession).toBe(true)
  })

  it("anonymous scope のとき null session が観測されたら受理する", () => {
    const { runtimeSession } = setup()

    const shouldClearSession = runtimeSession.applyObservedSession(null)

    expect(shouldClearSession).toBe(false)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual(anonymousState)
  })

  it("anonymous scope のとき user session が観測されても受理しない", () => {
    const { runtimeSession } = setup()
    const nextSession = createSession("user1")

    const shouldClearSession = runtimeSession.applyObservedSession(nextSession)

    expect(shouldClearSession).toBe(true)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual(anonymousState)
  })

  it("user scope のとき null session が観測されたら受理して sessionLost とする", () => {
    vi.mocked(loadStoredDataScope).mockReturnValue({ type: "user", userId: "user1" })
    const { runtimeSession } = setup()

    const shouldClearSession = runtimeSession.applyObservedSession(null)

    expect(shouldClearSession).toBe(false)
    expect(runtimeSession.session.value).toBeNull()
    expect(runtimeSession.runtimeSessionState.value).toEqual({
      scope: { type: "user", userId: "user1" },
      syncStatus: "sessionLost",
    })
  })

  it("user scope のとき同じ user の session が観測されたら受理する", () => {
    vi.mocked(loadStoredDataScope).mockReturnValue({ type: "user", userId: "user1" })
    const { runtimeSession } = setup()
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
  })

  it("user scope のとき異なる user の session が観測されたら受理せず sessionLost とする", () => {
    vi.mocked(loadStoredDataScope).mockReturnValue({ type: "user", userId: "user1" })
    const { runtimeSession } = setup()
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
  })

  it("認証済みセッションが commit された場合は現在の scope に関係なく受理する", () => {
    const { runtimeSession } = setup()
    const previousSession = createSession("user1")
    const nextSession = createSession("user2")

    runtimeSession.commitAuthenticatedSession(previousSession)
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

  it("user scope のとき startAuthCheck で authPending 状態に移る", () => {
    vi.mocked(loadStoredDataScope).mockReturnValue({ type: "user", userId: "user1" })
    const { runtimeSession } = setup()

    runtimeSession.startAuthCheck()

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
    vi.mocked(loadStoredDataScope).mockReturnValue({ type: "user", userId: "user1" })
    const { runtimeSession } = setup()

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
})
