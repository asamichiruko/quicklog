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

  function setup(overrides: Partial<ListenerOptions> = {}) {
    const options: ListenerOptions = {
      shouldIgnoreAuthEvent: vi.fn(() => false),
      onResolvedSession: vi.fn(),
      onReloadFailed: vi.fn(),
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
    const { listener } = setup()

    listener.start()
    listener.start()

    expect(mocks.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it("イベントのセッションを onResolvedSession に渡す", () => {
    const { listener, options } = setup()
    const session = createSession("user1")

    listener.start()
    authStateChangeCallback("SIGNED_IN", session)

    expect(options.shouldIgnoreAuthEvent).toHaveBeenCalledOnce()
    expect(options.onResolvedSession).toHaveBeenCalledExactlyOnceWith(session)
  })

  it("shouldIgnoreAuthEvent() が true ならイベントのセッションを onResolvedSession に渡さない", () => {
    const onResolvedSession = vi.fn()
    const { listener } = setup({
      shouldIgnoreAuthEvent: vi.fn(() => true),
      onResolvedSession,
    })

    listener.start()
    authStateChangeCallback("SIGNED_IN", createSession("user1"))

    expect(onResolvedSession).not.toHaveBeenCalled()
  })

  it("登録したイベントコールバックが同期的に終了する", () => {
    const { listener } = setup({
      onResolvedSession: vi.fn(async () => undefined),
    })

    listener.start()
    const result = authStateChangeCallback("SIGNED_IN", createSession("user1"))

    expect(result).toBeUndefined()
  })

  it("stop() 後に再度 start() できる", () => {
    const { listener } = setup()

    listener.start()
    listener.stop()
    listener.start()

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(2)
  })

  it("start() する前に stop() しても unsubscribe されない", () => {
    const { listener } = setup()

    listener.stop()

    expect(mocks.unsubscribe).not.toHaveBeenCalled()
  })

  it("unmount 時に購読を解除する", () => {
    const { listener, wrapper } = setup()

    listener.start()
    wrapper.unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it("reload() 成功時に現在のセッションを onResolvedSession に渡す", async () => {
    const session = createSession("user1")
    mocks.getCurrentSession.mockResolvedValue(session)
    const { listener, options } = setup()

    await listener.reload()

    expect(mocks.getCurrentSession).toHaveBeenCalledOnce()
    expect(options.onResolvedSession).toHaveBeenCalledExactlyOnceWith(session)
    expect(options.onReloadFailed).not.toHaveBeenCalled()
  })

  it("reload() 失敗時に onReloadFailed を呼ぶ", async () => {
    const error = new Error("reload failed")
    mocks.getCurrentSession.mockRejectedValue(error)
    const { listener, options } = setup()

    await listener.reload()

    expect(options.onResolvedSession).not.toHaveBeenCalled()
    expect(options.onReloadFailed).toHaveBeenCalledExactlyOnceWith(error)
  })

  it("reload() で null が取得された場合も onResolvedSession にそれを渡す", async () => {
    mocks.getCurrentSession.mockResolvedValue(null)
    const { listener, options } = setup()

    await listener.reload()

    expect(mocks.getCurrentSession).toHaveBeenCalledOnce()
    expect(options.onResolvedSession).toHaveBeenCalledExactlyOnceWith(null)
    expect(options.onReloadFailed).not.toHaveBeenCalled()
  })
})
