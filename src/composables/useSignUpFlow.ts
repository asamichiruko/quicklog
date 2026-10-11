import { getAuthFeedbackMessage } from "@/lib/authFeedbackMessage"
import {
  validateCreatedPassword,
  validateEmail,
  validateVerificationCode,
} from "@/lib/authFormValidation"
import type { FeedbackKind } from "@/types"
import { computed, readonly, ref, type Ref } from "vue"

export type SignUpFlowStep = "idle" | "awaitingCode"

export function useSignUpFlow(options: {
  isLoading: Ref<boolean>
  setFeedback: (message: string, kind: FeedbackKind | null) => void
  onCancelled: () => void
  onVerificationFinished: () => void
  onResent: () => void
  signUpWithEmail: (email: string, password: string) => Promise<void>
  verifySignUpCode: (email: string, code: string) => Promise<void>
  resendSignUpCode: (email: string) => Promise<void>
}) {
  const step = ref<SignUpFlowStep>("idle")
  const requestEmail = ref("")
  const hasActiveFlow = computed(() => step.value !== "idle")

  function cancel() {
    requestEmail.value = ""
    step.value = "idle"
    options.setFeedback("", null)
    options.onCancelled()
  }

  async function request(email: string, password: string): Promise<void> {
    if (step.value !== "idle") return

    const trimmedEmail = email.trim()

    if (options.isLoading.value) return
    if (validateEmail(trimmedEmail) !== "" || validateCreatedPassword(password) !== "") return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.signUpWithEmail(trimmedEmail, password)

      requestEmail.value = trimmedEmail
      step.value = "awaitingCode"
      options.setFeedback("確認メールを送信しました", "success")
    } catch (error) {
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      options.isLoading.value = false
    }
  }

  async function verify(code: string): Promise<void> {
    if (step.value !== "awaitingCode") return
    if (options.isLoading.value) return
    if (validateVerificationCode(code) !== "") return
    if (!requestEmail.value) return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.verifySignUpCode(requestEmail.value, code)
      options.setFeedback("認証に成功しました", "success")

      requestEmail.value = ""
      step.value = "idle"
    } catch (error) {
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      options.onVerificationFinished()
      options.isLoading.value = false
    }
  }

  async function resend(): Promise<void> {
    if (step.value !== "awaitingCode") return
    if (options.isLoading.value) return
    if (!requestEmail.value) return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.resendSignUpCode(requestEmail.value)
      options.setFeedback("アカウント作成用のメールを再送しました", "success")

      options.onResent()
    } catch (error) {
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      options.isLoading.value = false
    }
  }

  return {
    step: readonly(step),
    requestEmail: readonly(requestEmail),
    hasActiveFlow,
    request,
    verify,
    resend,
    cancel,
  }
}
