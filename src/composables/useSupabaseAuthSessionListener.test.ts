import { useSupabaseAuthSessionListener } from "@/composables/useSupabaseAuthSessionListener"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { mount, type VueWrapper } from "@vue/test-utils"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { describe } from "vitest"
import { defineComponent } from "vue"

type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null,
) => void | Promise<void>

const mocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { onAuthStateChange: mocks.onAuthStateChange } },
}))

vi.mock("@/lib/auth", () => ({
  getCurrentSession: mocks.getCurrentSession,
}))

function createSession(userId: string) {
  return { user: { id: userId } } as Session
}

describe("useSupabaseAuthSessionListener", () => {
  const wrappers: VueWrapper[] = []
  let authStateChangeCallback!: AuthStateChangeCallback

  beforeEach(() => {
    mocks.onAuthStateChange.mockImplementation((callback: AuthStateChangeCallback) => {
      authStateChangeCallback = callback
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
    })
  })

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers.length = 0
    vi.resetAllMocks()
  })

  type ListenerOptions = Parameters<typeof useSupabaseAuthSessionListener>[0]

  function setup(ignoreAuthEvent: boolean, overrides: Partial<ListenerOptions> = {}) {
    const options: ListenerOptions = {
      shouldIgnoreAuthEvent: vi.fn(() => ignoreAuthEvent),
      onResolvedSession: vi.fn(),
      onCurrentSessionLoadFailed: vi.fn(),
      ...overrides,
    }

    let listener!: ReturnType<typeof useSupabaseAuthSessionListener>

    const TestComponent = defineComponent({
      setup() {
        listener = useSupabaseAuthSessionListener(options)
        return () => null
      },
    })

    const wrapper = mount(TestComponent)
    wrappers.push(wrapper)

    return {
      listener,
      options,
      wrapper,
    }
  }

  it("start() を複数回呼んでも 1 度だけしか購読されない", () => {
    const { listener } = setup(false)

    listener.start()
    listener.start()

    expect(mocks.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it("認証イベントを無視しない状態でイベントが届くとセッションを通知する", () => {
    const { listener, options } = setup(false)
    const session = createSession("user1")

    listener.start()
    authStateChangeCallback("SIGNED_IN", session)

    expect(options.shouldIgnoreAuthEvent).toHaveBeenCalledOnce()
    expect(options.onResolvedSession).toHaveBeenCalledExactlyOnceWith(session)
  })

  it("認証イベントを無視する状態でイベントが届くとセッションを通知しない", () => {
    const onResolvedSession = vi.fn()
    const { listener } = setup(true, {
      onResolvedSession,
    })

    listener.start()
    authStateChangeCallback("SIGNED_IN", createSession("user1"))

    expect(onResolvedSession).not.toHaveBeenCalled()
  })

  it("通知先が非同期でも認証イベントのコールバックは同期的に終了する", () => {
    const { listener } = setup(false, {
      onResolvedSession: vi.fn(async () => undefined),
    })

    listener.start()
    const result = authStateChangeCallback("SIGNED_IN", createSession("user1"))

    expect(result).toBeUndefined()
  })

  it("購読を停止して再開すると古い購読を解除して新しく購読する", () => {
    const { listener } = setup(false)

    listener.start()
    listener.stop()
    listener.start()

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(2)
  })

  it("start() する前に stop() しても unsubscribe されない", () => {
    const { listener } = setup(false)

    listener.stop()

    expect(mocks.unsubscribe).not.toHaveBeenCalled()
  })

  it("unmount 時に購読を解除する", () => {
    const { listener, wrapper } = setup(false)

    listener.start()
    wrapper.unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it("現在のセッションを取得すると取得したセッションを通知する", async () => {
    const session = createSession("user1")
    mocks.getCurrentSession.mockResolvedValue(session)
    const { listener, options } = setup(false)

    await listener.reconcileCurrentSession()

    expect(mocks.getCurrentSession).toHaveBeenCalledOnce()
    expect(options.onResolvedSession).toHaveBeenCalledExactlyOnceWith(session)
    expect(options.onCurrentSessionLoadFailed).not.toHaveBeenCalled()
  })

  it("現在のセッションの取得に失敗すると失敗だけを通知する", async () => {
    const error = new Error("reload failed")
    mocks.getCurrentSession.mockRejectedValue(error)
    const { listener, options } = setup(false)

    await listener.reconcileCurrentSession()

    expect(options.onResolvedSession).not.toHaveBeenCalled()
    expect(options.onCurrentSessionLoadFailed).toHaveBeenCalledExactlyOnceWith(error)
  })

  it("現在のセッションが null の場合は null を通知する", async () => {
    mocks.getCurrentSession.mockResolvedValue(null)
    const { listener, options } = setup(false)

    await listener.reconcileCurrentSession()

    expect(mocks.getCurrentSession).toHaveBeenCalledOnce()
    expect(options.onResolvedSession).toHaveBeenCalledExactlyOnceWith(null)
    expect(options.onCurrentSessionLoadFailed).not.toHaveBeenCalled()
  })
})
