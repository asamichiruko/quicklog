import type { Session, User } from "@supabase/supabase-js"
import { onUnmounted, readonly, ref, watch } from "vue"

export function useAccountUser(options: {
  getCurrentSession: () => Session | null
  getCurrentUser: () => Promise<User | null>
  getActiveCloudUser: () => User | null
}) {
  const accountUser = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<unknown>(null)
  let requestId = 0
  let refreshTimer: ReturnType<typeof setTimeout> | undefined

  // 表示中の user は消さず、予約と取得中の応答を無効にする
  function invalidateRequest() {
    requestId += 1

    if (refreshTimer !== undefined) {
      clearTimeout(refreshTimer)
      refreshTimer = undefined
    }

    isLoading.value = false
    error.value = null
  }

  function clear() {
    invalidateRequest()
    accountUser.value = null
  }

  function getContext() {
    const session = options.getCurrentSession()
    const user = options.getActiveCloudUser()

    if (!session || !user || session.user.id !== user.id) return null

    return { session, userId: user.id }
  }

  async function refresh(): Promise<void> {
    invalidateRequest()

    const context = getContext()
    if (!context) {
      accountUser.value = null
      return
    }

    if (accountUser.value?.id !== context.userId) {
      accountUser.value = null
    }

    const currentRequestId = requestId
    isLoading.value = true

    function canApplyResult() {
      if (!context) return false

      const current = getContext()

      return (
        currentRequestId === requestId &&
        current?.session === context.session &&
        current?.userId === context.userId
      )
    }

    try {
      const user = await options.getCurrentUser()
      if (!canApplyResult()) return

      accountUser.value = user?.id === context.userId ? user : null
    } catch (cause) {
      if (!canApplyResult()) return
      error.value = cause
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false
      }
    }
  }

  function scheduleRefresh() {
    invalidateRequest()

    const context = getContext()
    if (!context) {
      accountUser.value = null
      return
    }

    if (accountUser.value?.id !== context.userId) {
      accountUser.value = null
    }

    isLoading.value = true

    // 認証イベントの処理中に直接 getUser() を呼ばない
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined
      void refresh()
    }, 0)
  }

  watch(
    [options.getCurrentSession, () => options.getActiveCloudUser()?.id ?? null],
    scheduleRefresh,
    { immediate: true, flush: "sync" },
  )

  onUnmounted(clear)

  return {
    user: readonly(accountUser),
    isLoading: readonly(isLoading),
    error: readonly(error),
    refresh,
    clear,
  }
}

export type AccountUserView = Pick<
  ReturnType<typeof useAccountUser>,
  "user" | "isLoading" | "error" | "refresh"
>
