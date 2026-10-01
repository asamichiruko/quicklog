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
  let accountUserRequestId = 0

  // 通信自体は中断せず、進行中の取得結果を無効にする
  function clear() {
    accountUserRequestId += 1
    accountUser.value = null
    isLoading.value = false
    error.value = null
  }

  watch([options.getCurrentSession, () => options.getActiveCloudUser()?.id ?? null], clear, {
    flush: "sync",
  })

  onUnmounted(clear)

  // 取得失敗は error に保持し、呼び出し元には再送出しない
  async function refresh(): Promise<void> {
    clear()
    const requestId = accountUserRequestId
    const startedSession = options.getCurrentSession()
    const activeUser = options.getActiveCloudUser()

    if (!startedSession || !activeUser || startedSession.user.id !== activeUser.id) return

    function canApplyResult() {
      return (
        requestId === accountUserRequestId &&
        options.getCurrentSession() === startedSession &&
        options.getActiveCloudUser()?.id === activeUser?.id
      )
    }

    isLoading.value = true
    try {
      const user = await options.getCurrentUser()
      if (!canApplyResult()) return

      accountUser.value = user?.id === activeUser.id ? user : null
    } catch (cause) {
      if (!canApplyResult()) return
      error.value = cause
    } finally {
      // 古いリクエストの終了で新しいリクエストの読み込み表示を消さない
      if (requestId === accountUserRequestId) isLoading.value = false
    }
  }

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
