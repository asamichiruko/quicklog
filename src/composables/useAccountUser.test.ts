import type { Session, User } from "@supabase/supabase-js"
import { afterEach, describe, expect, it, vi } from "vitest"
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

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount()
  }
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
  it("明示的な refresh で最新のユーザー情報を取得する", async () => {
    const { account, getCurrentUser } = setup()
    const pending = deferred<User | null>()
    getCurrentUser.mockReturnValue(pending.promise)

    expect(account.user.value).toBeNull()
    expect(account.isLoading.value).toBe(false)
    expect(account.error.value).toBeNull()
    expect(getCurrentUser).not.toHaveBeenCalled()

    const refreshPromise = account.refresh()

    expect(account.isLoading.value).toBe(true)

    const updated = createUser("user1", "new@example.com")
    pending.resolve(updated)

    await refreshPromise

    expect(account.user.value).toEqual(updated)
    expect(account.isLoading.value).toBe(false)
  })

  it("認証状態が利用できなければ取得せずクリアする", async () => {
    const { account, session, getCurrentUser } = setup()

    await account.refresh()
    session.value = null

    expect(account.user.value).toBeNull()

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledTimes(1)
  })

  it("同期可能なユーザーがなくなれば取得済み情報をクリアする", async () => {
    const { account, activeUser, getCurrentUser } = setup()

    await account.refresh()
    activeUser.value = null

    expect(account.user.value).toBeNull()

    await account.refresh()

    expect(getCurrentUser).toHaveBeenCalledTimes(1)
  })

  it("取得失敗を保持し、再取得開始時にエラーと古い情報を消す", async () => {
    const { account, getCurrentUser } = setup()

    await account.refresh()

    const failure = new Error("network unavailable")
    getCurrentUser.mockRejectedValueOnce(failure)

    await expect(account.refresh()).resolves.toBeUndefined()
    expect(account.error.value).toBe(failure)
    expect(account.user.value).toBeNull()
    expect(account.isLoading.value).toBe(false)

    await account.refresh()

    expect(account.error.value).toBeNull()
    expect(account.user.value).not.toBeNull()
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
    "古い取得の %s で新しい取得を上書きしない",
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

  it.each(["clear", "session", "user", "unmount"] as const)(
    "%s 後に届く応答を無視する",
    async (action) => {
      const { account, session, activeUser, getCurrentUser, wrapper } = setup()
      const pending = deferred<User | null>()
      getCurrentUser.mockReturnValue(pending.promise)

      const refresh = account.refresh()

      if (action === "clear") account.clear()
      if (action === "session") session.value = { user: createUser() } as Session
      if (action === "user") activeUser.value = createUser("other")
      if (action === "unmount") wrapper.unmount()

      expect(account.isLoading.value).toBe(false)

      pending.resolve(createUser())
      await refresh

      expect(account.user.value).toBeNull()
      expect(account.error.value).toBeNull()
    },
  )
})
