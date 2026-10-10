import { getAuthFeedbackMessage } from "@/lib/authFeedbackMessage"
import {
  validateCreatedPassword,
  validateEmail,
  validateVerificationCode,
} from "@/lib/authFormValidation"
import type { FeedbackKind } from "@/types"
import { computed, readonly, ref, type Ref } from "vue"

export type PasswordResetFlowStep = "idle" | "awaitingCode" | "settingPassword"

export function usePasswordResetFlow(options: {
  setFeedback: (message: string, kind: FeedbackKind | null) => void
  cancelPasswordRecovery: () => Promise<void>
  isLoading: Ref<boolean>
  sendPasswordResetCode: (email: string) => Promise<void>
  verifyPasswordResetCode: (email: string, code: string) => Promise<void>
  updatePasswordAfterRecovery: (password: string) => Promise<void>
  resetVerificationInput: () => void
  resetFormInputs: () => void
  onCancelled: () => void
  onCompleted: () => void
}) {
  const step = ref<PasswordResetFlowStep>("idle")
  const requestEmail = ref("")
  const hasActiveFlow = computed(() => step.value !== "idle")

  async function cancel() {
    await options.cancelPasswordRecovery()
    requestEmail.value = ""
    options.resetFormInputs()
    options.setFeedback("", null)
    step.value = "idle"
    options.onCancelled()
  }

  async function request(email: string) {
    if (step.value !== "idle") return

    const trimmedEmail = email.trim()

    if (validateEmail(trimmedEmail) !== "") return
    if (options.isLoading.value) return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.sendPasswordResetCode(trimmedEmail)

      options.setFeedback("パスワードリセット用のメールを送信しました", "success")
      options.resetVerificationInput()
      requestEmail.value = trimmedEmail
      step.value = "awaitingCode"
    } catch (error) {
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      options.isLoading.value = false
    }
  }

  async function resend() {
    if (step.value !== "awaitingCode") return
    if (options.isLoading.value) return
    if (!requestEmail.value) return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.sendPasswordResetCode(requestEmail.value)

      options.setFeedback("パスワードリセット用のメールを再送しました", "success")
      options.resetVerificationInput()
    } catch (error) {
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      options.isLoading.value = false
    }
  }

  async function verify(code: string) {
    if (step.value !== "awaitingCode") return
    if (options.isLoading.value) return
    if (validateVerificationCode(code) !== "") return
    if (!requestEmail.value) return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.verifyPasswordResetCode(requestEmail.value, code)

      options.setFeedback("認証に成功しました", "success")
      step.value = "settingPassword"
    } catch (error) {
      options.setFeedback(getAuthFeedbackMessage(error), "error")
    } finally {
      options.resetVerificationInput()
      options.isLoading.value = false
    }
  }

  async function resetPassword(password: string) {
    if (step.value !== "settingPassword") return
    if (options.isLoading.value) return
    if (validateCreatedPassword(password) !== "") return

    options.setFeedback("", null)
    options.isLoading.value = true

    try {
      await options.updatePasswordAfterRecovery(password)

      requestEmail.value = ""
      options.resetFormInputs()
      options.setFeedback("パスワードを再設定しました", "success")
      step.value = "idle"
      options.onCompleted()
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
    resend,
    verify,
    resetPassword,
    cancel,
  }
}
