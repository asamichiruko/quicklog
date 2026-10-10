import type { AccountUserView } from "@/composables/useAccountUser"
import { getAuthFeedbackMessage } from "@/lib/authFeedbackMessage"
import { validateEmail } from "@/lib/authFormValidation"
import type { FeedbackKind } from "@/types"
import type { Session } from "@supabase/supabase-js"
import { computed, readonly, ref, watch, type Ref } from "vue"

export type EmailChangeFlowStep = "idle" | "pending"

export function useEmailChangeFlow(options: {
  getSession: () => Session | null
  getCurrentEmail: () => string
  canUseCloudSession: () => boolean
  getAccountUser: () => AccountUserView
  requestEmailChange: (newEmail: string) => Promise<void>
  resendEmailChangeConfirmation: (newEmail: string) => Promise<void>
  showSignedInMainView: () => void
  isLoading: Ref<boolean>
  setFeedback: (message: string, kind: FeedbackKind | null) => void
}) {
  const emailChangeFlowStep = ref<EmailChangeFlowStep>("idle")
  const currentEmailAtChangingEmail = ref("")
  let emailChangeUserId: string | null = null
  let emailChangeRequestId = 0
  const newEmailAtChangingEmail = ref("")
  const hasActiveEmailChangeFlow = computed(() => emailChangeFlowStep.value !== "idle")

  function canRefreshEmailChangeState() {
    return (
      options.canUseCloudSession() &&
      emailChangeFlowStep.value === "pending" &&
      !options.isLoading.value &&
      !options.getAccountUser().isLoading.value &&
      emailChangeUserId !== null &&
      options.getSession()?.user.id === emailChangeUserId &&
      currentEmailAtChangingEmail.value !== "" &&
      newEmailAtChangingEmail.value !== ""
    )
  }

  function getRefreshEmailChangeStateFeedback(): {
    kind: FeedbackKind
    message: string
    completed: boolean
  } {
    const accountUser = options.getAccountUser()
    const user = accountUser.user.value
    const error = accountUser.error.value

    if (error !== null) {
      return {
        kind: "error",
        message: getAuthFeedbackMessage(error),
        completed: false,
      }
    }

    if (!user || !user.email) {
      return {
        kind: "error",
        message: "現在のメールアドレスを確認できません。アカウント情報を確認してください",
        completed: false,
      }
    }

    if (user.email === currentEmailAtChangingEmail.value) {
      return {
        kind: "success",
        message:
          "メールアドレスの変更はまだ反映されていません。各メールアドレス宛の確認メールのリンクを開いてください",
        completed: false,
      }
    }

    if (user.email === newEmailAtChangingEmail.value) {
      return {
        kind: "success",
        message: "メールアドレスの変更が完了しました",
        completed: true,
      }
    }

    return {
      kind: "error",
      message:
        "申請された変更先と異なるメールアドレスが登録されています。アカウント画面で現在のメールアドレスを確認してください",
      completed: false,
    }
  }

  async function request(newEmail: string) {
    const currentEmail = options.getCurrentEmail().trim()
    const trimmedNewEmail = newEmail.trim()
    if (
      options.isLoading.value ||
      validateEmail(newEmail) !== "" ||
      trimmedNewEmail === options.getCurrentEmail().trim()
    )
      return

    const session = options.getSession()
    if (!options.canUseCloudSession() || !session) return
    const requestedUserId = session.user.id
    const requestedCurrentEmail = currentEmail
    const requestedNewEmail = trimmedNewEmail
    if (validateEmail(requestedCurrentEmail) !== "") {
      options.setFeedback(
        "現在のメールアドレスを確認できません。アカウント情報を再取得してください",
        "error",
      )
      return
    }

    options.isLoading.value = true
    options.setFeedback("", null)

    emailChangeUserId = requestedUserId
    emailChangeRequestId += 1
    const requestId = emailChangeRequestId
    const canApplyResult = () =>
      requestId === emailChangeRequestId && options.getSession()?.user.id === requestedUserId

    try {
      await options.requestEmailChange(requestedNewEmail)
      if (!canApplyResult()) return

      currentEmailAtChangingEmail.value = requestedCurrentEmail
      newEmailAtChangingEmail.value = requestedNewEmail
      emailChangeFlowStep.value = "pending"

      options.setFeedback("メールアドレス変更用のメールを送信しました", "success")
    } catch (error) {
      if (!canApplyResult()) return
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      if (canApplyResult()) options.isLoading.value = false
    }
  }

  async function resend() {
    if (options.isLoading.value || emailChangeFlowStep.value !== "pending") return

    const session = options.getSession()

    if (!options.canUseCloudSession() || !session) return

    const requestedUserId = session.user.id
    if (emailChangeUserId !== requestedUserId) return

    const requestedNewEmail = newEmailAtChangingEmail.value.trim()
    if (validateEmail(requestedNewEmail) !== "") return

    options.isLoading.value = true
    options.setFeedback("", null)

    emailChangeRequestId += 1
    const requestId = emailChangeRequestId
    const canApplyResult = () =>
      requestId === emailChangeRequestId && options.getSession()?.user.id === requestedUserId

    try {
      await options.resendEmailChangeConfirmation(requestedNewEmail)
      if (!canApplyResult()) return

      options.setFeedback("メールアドレス変更用のメールを再送しました", "success")
    } catch (error) {
      if (!canApplyResult()) return
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      if (canApplyResult()) options.isLoading.value = false
    }
  }

  async function refresh() {
    if (!canRefreshEmailChangeState()) return

    const userId = emailChangeUserId
    const requestId = emailChangeRequestId

    await options.getAccountUser().refresh()

    if (
      !canRefreshEmailChangeState() ||
      userId !== options.getSession()?.user.id ||
      userId !== emailChangeUserId ||
      requestId !== emailChangeRequestId
    )
      return

    const user = options.getAccountUser().user.value
    if (user && user.id !== userId) return

    const feedback = getRefreshEmailChangeStateFeedback()

    if (feedback.completed) {
      complete()
    }

    options.setFeedback(feedback.message, feedback.kind)
  }

  function clear() {
    currentEmailAtChangingEmail.value = ""
    newEmailAtChangingEmail.value = ""
    emailChangeFlowStep.value = "idle"
    options.setFeedback("", null)
  }

  function revise() {
    emailChangeFlowStep.value = "idle"
    options.setFeedback("", null)
  }

  function complete() {
    emailChangeRequestId += 1
    emailChangeUserId = null
    clear()
    options.showSignedInMainView()
    options.isLoading.value = false
  }

  watch(
    [
      () => options.getAccountUser().user.value,
      () => options.getAccountUser().isLoading.value,
      () => options.getAccountUser().error.value,
      emailChangeFlowStep,
    ],
    () => {
      if (!canRefreshEmailChangeState()) return
      const user = options.getAccountUser().user.value
      if (!user || user.id !== emailChangeUserId) return

      const feedback = getRefreshEmailChangeStateFeedback()

      if (feedback.completed) {
        complete()
        options.setFeedback(feedback.message, feedback.kind)
      }
    },
  )

  watch(
    () => options.getSession()?.user.id ?? null,
    (userId) => {
      if (emailChangeUserId === null || userId === emailChangeUserId) return

      emailChangeRequestId += 1
      emailChangeUserId = null
      clear()
      options.showSignedInMainView()
      options.isLoading.value = false
    },
    { flush: "sync" },
  )

  return {
    emailChangeFlowStep: readonly(emailChangeFlowStep),
    currentEmailAtChangingEmail: readonly(currentEmailAtChangingEmail),
    newEmailAtChangingEmail: readonly(newEmailAtChangingEmail),
    hasActiveEmailChangeFlow,
    request,
    resend,
    refresh,
    revise,
    clear,
  }
}
