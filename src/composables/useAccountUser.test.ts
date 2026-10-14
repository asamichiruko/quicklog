import type { Session, User } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, ref } from "vue"
import { mount, type VueWrapper } from "@vue/test-utils"
import { useAccountUser } from "./useAccountUser"

function createUser(id: string, email: string) {
  return { id, email } as User
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.useFakeTimers()
})

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount()
  }

  vi.clearAllTimers()
  vi.useRealTimers()
})

function setup(user: User | null) {
  const session = ref<Session | null>(user ? ({ user } as Session) : null)
  const activeUser = ref<User | null>(user)
  const getCurrentUser = vi.fn<() => Promise<User | null>>().mockResolvedValue(user)
  let account!: ReturnType<typeof useAccountUser>

  const wrapper = mount(
    defineComponent({
      setup() {
        account = useAccountUser({
          getCurrentSession: () => session.value,
          getActiveCloudUser: () => activeUser.value,
          getCurrentUser,
        })
        return () => null
      },
    }),
  )

  wrappers.push(wrapper)

  return { account, session, activeUser, getCurrentUser, wrapper }
}

describe("useAccountUser", () => {
  it("認証済みで composable を生成するとイベント処理の外で最新ユーザー情報を取得する", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser } = setup(initialUser)
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(pending.promise)

    expect(account.isLoading.value).toBe(true)
    expect(account.user.value).toBeNull()
    expect(getCurrentUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(0)

    expect(getCurrentUser).toHaveBeenCalledOnce()
    expect(account.isLoading.value).toBe(true)

    const updated = createUser("user1", "new@example.com")

    pending.resolve(updated)
    await pending.promise

    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
  })

  it("未サインイン状態からサインインすると最新ユーザー情報を自動取得する", async () => {
    const { account, session, activeUser, getCurrentUser } = setup(null)

    await vi.advanceTimersByTimeAsync(0)

    // セッション情報 が null なので、ここでは getCurrentUser が実行されない
    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(account.isLoading.value).toBe(false)

    const signedInUser = createUser("user1", "old@example.com")
    getCurrentUser.mockResolvedValue(signedInUser)

    session.value = { user: signedInUser } as Session
    activeUser.value = signedInUser

    // session と activeUser が揃うと取得が予約される
    expect(account.isLoading.value).toBe(true)
    expect(getCurrentUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(0)

    expect(getCurrentUser).toHaveBeenCalledOnce()
    expect(account.user.value).toEqual(signedInUser)
    expect(account.isLoading.value).toBe(false)
  })

  it("同一ユーザーのセッションを更新すると既存情報を保持しながら再取得する", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, session, getCurrentUser } = setup(initialUser)

    await vi.advanceTimersByTimeAsync(0)

    const previous = account.user.value
    expect(previous).toEqual(initialUser)

    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(pending.promise)

    // 同じユーザーでもセッションオブジェクトが新しくなると再取得が予約される
    session.value = { user: initialUser } as Session

    expect(account.user.value).toEqual(previous)
    expect(account.isLoading.value).toBe(true)

    await vi.advanceTimersByTimeAsync(0)

    expect(getCurrentUser).toHaveBeenCalledTimes(2)
    expect(account.user.value).toEqual(previous)

    const updated = createUser("user1", "new@example.com")

    pending.resolve(updated)
    await pending.promise

    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
  })

  it("同一ユーザーの再取得が失敗すると情報を保持し、再試行で更新する", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser } = setup(initialUser)

    await vi.advanceTimersByTimeAsync(0)

    const previous = account.user.value

    const failure = new Error("network unavailable")
    getCurrentUser.mockRejectedValueOnce(failure)

    await account.refresh()

    expect(account.user.value).toEqual(previous)
    expect(account.error.value).toBe(failure)
    expect(account.isLoading.value).toBe(false)

    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(pending.promise)

    const refreshPromise = account.refresh()

    expect(account.user.value).toEqual(previous)
    expect(account.error.value).toBeNull()
    expect(account.isLoading.value).toBe(true)

    const updated = createUser("user1", "new@example.com")

    pending.resolve(updated)
    await refreshPromise

    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
  })

  it("認証済みで明示的に refresh すると初回予約を置き換えて最新情報を取得する", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser } = setup(initialUser)
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValue(pending.promise)

    expect(account.user.value).toBeNull()
    expect(account.isLoading.value).toBe(true)
    expect(account.error.value).toBeNull()
    expect(getCurrentUser).not.toHaveBeenCalled()

    const refreshPromise = account.refresh()

    expect(account.isLoading.value).toBe(true)

    const updated = createUser("user1", "new@example.com")

    pending.resolve(updated)
    await refreshPromise
    await vi.advanceTimersByTimeAsync(0)

    expect(getCurrentUser).toHaveBeenCalledOnce()
    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
  })

  it("取得済みの状態でセッションを失うと情報を消し、refresh しても取得しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, session, getCurrentUser } = setup(initialUser)

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()

    session.value = null

    // session が null なので getCurrentUser を呼ばない
    expect(account.user.value).toBeNull()
    expect(getCurrentUser).toHaveBeenCalledOnce()

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()
  })

  it("取得済みの状態で同期可能なユーザーがなくなると情報を消し、refresh しても取得しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, activeUser, getCurrentUser } = setup(initialUser)

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()

    activeUser.value = null

    // activeUser が null なので getCurrentUser を呼ばない
    expect(account.user.value).toBeNull()
    expect(getCurrentUser).toHaveBeenCalledOnce()

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()
  })

  it("同一ユーザーを取得済みの状態で null が返ると取得情報を消す", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser } = setup(initialUser)

    await account.refresh()

    getCurrentUser.mockResolvedValueOnce(null)

    await account.refresh()

    expect(account.user.value).toBeNull()
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
  })

  it("同一ユーザーを取得済みの状態で別ユーザーが返ると取得情報を消す", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser } = setup(initialUser)

    await account.refresh()

    getCurrentUser.mockResolvedValueOnce(createUser("other", "other@example.com"))

    await account.refresh()

    expect(account.user.value).toBeNull()
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
  })

  it("再取得中に古い応答が成功しても待機状態を変更しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const updatedUser = createUser("user1", "new@example.com")
    const { account, getCurrentUser } = setup(initialUser)
    const older = deferred<User | null>()
    const newer = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

    const first = account.refresh()
    const second = account.refresh()
    older.resolve(initialUser)
    await first

    expect(account.isLoading.value).toBe(true)
    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()

    newer.resolve(updatedUser)
    await second

    expect(account.user.value).toEqual(updatedUser)
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
  })

  it("再取得中に古い応答が失敗しても待機状態を変更しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const updatedUser = createUser("user1", "new@example.com")
    const { account, getCurrentUser } = setup(initialUser)
    const older = deferred<User | null>()
    const newer = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

    const first = account.refresh()
    const second = account.refresh()
    older.reject(new Error("old failure"))
    await first

    expect(account.isLoading.value).toBe(true)
    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()

    newer.resolve(updatedUser)
    await second

    expect(account.user.value).toEqual(updatedUser)
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
  })

  it("取得中に clear すると後から届く応答を反映しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser } = setup(initialUser)
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValue(pending.promise)

    const refreshPromise = account.refresh()
    account.clear()

    expect(account.isLoading.value).toBe(false)

    pending.resolve(initialUser)
    await refreshPromise

    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()
  })

  it("取得中に別ユーザーへ切り替えると後から届く応答を反映しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser, activeUser } = setup(initialUser)
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValue(pending.promise)

    const refreshPromise = account.refresh()
    activeUser.value = createUser("other", "other@example.com")

    expect(account.isLoading.value).toBe(false)

    pending.resolve(initialUser)
    await refreshPromise

    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()
  })

  it("取得中に unmount すると後から届く応答を反映しない", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, getCurrentUser, wrapper } = setup(initialUser)
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValue(pending.promise)

    const refreshPromise = account.refresh()
    wrapper.unmount()

    expect(account.isLoading.value).toBe(false)

    pending.resolve(initialUser)
    await refreshPromise

    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()
  })

  it("取得済みの状態で別ユーザーへ切り替えると情報を即座に消し、新しいユーザーを取得する", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, session, activeUser, getCurrentUser } = setup(initialUser)

    await vi.advanceTimersByTimeAsync(0)

    const previous = account.user.value

    const next = createUser("user2", "new@example.com")

    expect(previous).toEqual(initialUser)

    getCurrentUser.mockResolvedValue(next)

    session.value = { user: next } as Session
    activeUser.value = next

    expect(account.user.value).toBeNull()
    expect(account.isLoading.value).toBe(true)

    await vi.advanceTimersByTimeAsync(0)

    expect(account.user.value).toEqual(next)
    expect(account.isLoading.value).toBe(false)
    expect(getCurrentUser).toHaveBeenCalledTimes(2)
  })

  it("取得中に同一ユーザーのセッションを更新すると古い応答を無視して再取得する", async () => {
    const initialUser = createUser("user1", "old@example.com")
    const { account, session, getCurrentUser } = setup(initialUser)
    const pending = deferred<User | null>()
    const pendingResult = initialUser
    getCurrentUser.mockReturnValue(pending.promise)

    const refreshPromise = account.refresh()
    session.value = { user: initialUser } as Session

    // session 更新時は再取得が予約されるため isLoading は true となる
    expect(account.isLoading.value).toBe(true)

    pending.resolve(pendingResult)
    await refreshPromise

    expect(account.isLoading.value).toBe(true)
    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()

    await vi.advanceTimersByTimeAsync(0)

    expect(account.isLoading.value).toBe(false)
    expect(account.user.value).toEqual(pendingResult)
    expect(account.error.value).toBeNull()
  })
})
