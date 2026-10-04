import type { Session, User } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, ref } from "vue"
import { mount, type VueWrapper } from "@vue/test-utils"
import { useAccountUser } from "./useAccountUser"

function createUser(id = "user1", email = "old@example.com") {
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

function setup() {
  const user = createUser()
  const session = ref<Session | null>({ user } as Session)
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
  it("composable インスタンス生成時に最新ユーザー情報の取得を予約し、自動取得する", async () => {
    // setup で取得可能な認証状態を用意する
    const { account, getCurrentUser } = setup()
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(pending.promise)

    // すでに context が存在するので予約が開始される
    expect(account.isLoading.value).toBe(true)
    expect(account.user.value).toBeNull()
    expect(getCurrentUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(0)

    // タイマーで非同期的に getCurrentUser が呼ばれる
    expect(getCurrentUser).toHaveBeenCalledOnce()
    expect(account.isLoading.value).toBe(true)

    const updated = createUser("user1", "new@example.com")
    pending.resolve(updated)
    await pending.promise

    // 認証状態が変わらず、取得結果のユーザー ID も一致するため結果が反映される
    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
  })

  it("未サインイン状態からサインインすると最新ユーザー情報を自動取得する", async () => {
    const { account, session, activeUser, getCurrentUser } = setup()

    // session に null を代入した時点で setup 時の初回予約は取り消される
    session.value = null
    activeUser.value = null

    await vi.advanceTimersByTimeAsync(0)

    // セッション情報 が null なので、ここでは getCurrentUser が実行されない
    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(account.isLoading.value).toBe(false)

    const signedInUser = createUser()
    session.value = { user: signedInUser } as Session
    activeUser.value = signedInUser

    // session と activeUser が揃うと取得が予約される
    expect(account.isLoading.value).toBe(true)
    expect(getCurrentUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(0)

    // 認証状態が変わらず、取得結果のユーザー ID も一致するため結果が反映される
    expect(getCurrentUser).toHaveBeenCalledOnce()
    expect(account.user.value).toEqual(signedInUser)
    expect(account.isLoading.value).toBe(false)
  })

  it("同一ユーザーのセッション更新では既存のユーザー情報を保持しながら再取得する", async () => {
    // 初回取得を予約し、タイマーを進めて完了させる
    const { account, session, getCurrentUser } = setup()

    await vi.advanceTimersByTimeAsync(0)

    const previous = account.user.value
    expect(previous).toEqual(createUser())

    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(pending.promise)

    // 同じユーザーでもセッションオブジェクトが新しくなると再取得が予約される
    session.value = { user: createUser() } as Session

    // 再取得を予約しても取得済みの情報は消えない
    expect(account.user.value).toEqual(previous)
    expect(account.isLoading.value).toBe(true)

    await vi.advanceTimersByTimeAsync(0)

    // この時点で 2 回目の取得はまだ完了していないため、取得済みの情報を保持している
    expect(getCurrentUser).toHaveBeenCalledTimes(2)
    expect(account.user.value).toEqual(previous)

    const updated = createUser("user1", "new@example.com")
    pending.resolve(updated)
    await pending.promise

    // 取得が完了すると新しい値に書き換わる
    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
  })

  it("再取得に失敗しても同一ユーザーの情報を保持する", async () => {
    const { account, getCurrentUser } = setup()

    await vi.advanceTimersByTimeAsync(0)

    const previous = account.user.value
    const failure = new Error("network unavailable")
    getCurrentUser.mockRejectedValueOnce(failure)

    await account.refresh()

    // account.user はクリアされない
    expect(account.user.value).toEqual(previous)
    expect(account.error.value).toBe(failure)
    expect(account.isLoading.value).toBe(false)

    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValueOnce(pending.promise)

    const refreshPromise = account.refresh()

    // 再試行開始時は情報を保持してエラーだけ消す
    expect(account.user.value).toEqual(previous)
    expect(account.error.value).toBeNull()
    expect(account.isLoading.value).toBe(true)

    const updated = createUser("user1", "new@example.com")
    pending.resolve(updated)
    await refreshPromise

    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
  })

  it("明示的な refresh で最新のユーザー情報を取得する", async () => {
    const { account, getCurrentUser } = setup()
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

  it("認証状態が利用できなければ取得せずクリアする", async () => {
    const { account, session, getCurrentUser } = setup()
    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()

    session.value = null

    // session が null なので getCurrentUser を呼ばない
    expect(account.user.value).toBeNull()
    expect(getCurrentUser).toHaveBeenCalledOnce()

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()
  })

  it("同期可能なユーザーがなくなれば取得済み情報をクリアする", async () => {
    const { account, activeUser, getCurrentUser } = setup()
    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()

    activeUser.value = null

    // activeUser が null なので getCurrentUser を呼ばない
    expect(account.user.value).toBeNull()
    expect(getCurrentUser).toHaveBeenCalledOnce()

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledOnce()
  })

  it.each([null, createUser("other")])(
    "不在または別ユーザーの取得結果を反映しない: %s",
    async (result) => {
      const { account, getCurrentUser } = setup()

      await account.refresh()

      getCurrentUser.mockResolvedValueOnce(result)

      await account.refresh()

      expect(account.user.value).toBeNull()
    },
  )

  it.each(["resolve", "reject"] as const)(
    "取得待機中の状態を、古い応答 %s が変更しない",
    async (settle) => {
      const { account, getCurrentUser } = setup()
      const older = deferred<User | null>()
      const newer = deferred<User | null>()
      getCurrentUser.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

      const first = account.refresh()
      const second = account.refresh()

      if (settle === "resolve") {
        older.resolve(createUser())
      } else {
        older.reject(new Error("old failure"))
      }

      await first

      expect(account.isLoading.value).toBe(true)
      expect(account.user.value).toBeNull()
      expect(account.error.value).toBeNull()

      const updated = createUser("user1", "new@example.com")

      newer.resolve(updated)
      await second

      expect(account.user.value).toEqual(updated)
      expect(account.isLoading.value).toBe(false)
    },
  )

  it.each(["clear", "user", "unmount"] as const)("%s 後に届く応答を無視する", async (action) => {
    const { account, activeUser, getCurrentUser, wrapper } = setup()
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValue(pending.promise)

    const refreshPromise = account.refresh()

    if (action === "clear") account.clear()
    if (action === "user") activeUser.value = createUser("other")
    if (action === "unmount") wrapper.unmount()

    expect(account.isLoading.value).toBe(false)

    pending.resolve(createUser())
    await refreshPromise

    expect(account.user.value).toBeNull()
    expect(account.error.value).toBeNull()
  })

  it("別ユーザーへの切り替えで、取得済みの情報が即座に消える", async () => {
    const { account, session, activeUser, getCurrentUser } = setup()

    await vi.advanceTimersByTimeAsync(0)

    const previous = account.user.value
    const next = createUser("user2", "new@example.com")

    expect(previous).toEqual(createUser())

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

  it("セッション更新前に開始した取得の結果を無視する", async () => {
    const { account, session, getCurrentUser } = setup()
    const pending = deferred<User | null>()
    const pendingResult = createUser()
    getCurrentUser.mockReturnValue(pending.promise)

    const refreshPromise = account.refresh()
    session.value = { user: createUser() } as Session

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
