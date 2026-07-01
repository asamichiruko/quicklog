<script setup lang="ts">
import CloudSyncAccountOtpVerificationForm from "@/components/CloudSyncAccountOtpVerificationForm.vue"
import CloudSyncAccountPasswordChangeForm from "@/components/CloudSyncAccountPasswordChangeForm.vue"
import CloudSyncAccountPasswordResetForm from "@/components/CloudSyncAccountPasswordResetForm.vue"
import CloudSyncAccountPasswordResetRequestForm from "@/components/CloudSyncAccountPasswordResetRequestForm.vue"
import CloudSyncAccountSignedInView from "@/components/CloudSyncAccountSignedInView.vue"
import CloudSyncAccountSignInForm from "@/components/CloudSyncAccountSignInForm.vue"
import CloudSyncAccountSignUpForm from "@/components/CloudSyncAccountSignUpForm.vue"
import { getAuthFeedbackMessage } from "@/lib/authFeedbackMessage"
import {
  validateRequiredPassword,
  validateCreatedPassword,
  validateEmail,
  validateVerificationCode,
} from "@/lib/authFormValidation"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import { isAuthenticated, isAuthPending, isSessionLost } from "@/lib/runtimeSessionState"
import type { RuntimeSessionState } from "@/types"
import type { Session } from "@supabase/supabase-js"
import { computed, ref } from "vue"

export type CloudSyncAccountActions = {
  syncLogEntries?: () => Promise<CloudQuicklogDataSyncResult>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  deleteCloudSync: () => Promise<void>
  sendPasswordResetCode: (email: string) => Promise<void>
  verifyPasswordResetCode: (email: string, code: string) => Promise<void>
  updatePasswordAfterRecovery: (password: string) => Promise<void>
  changePassword: (newPassword: string, currentPassword: string) => Promise<void>
  verifySignUpCode: (email: string, code: string) => Promise<void>
  resendSignUpCode: (email: string) => Promise<void>
  cancelPasswordRecovery: () => void
}

const props = defineProps<{
  session: Session | null
  runtimeSessionState: RuntimeSessionState
  actions: CloudSyncAccountActions
}>()

export type SelectablePanelView = "signIn" | "signUp" | "passwordResetRequest"
export type SignedInPanelView = "main" | "changePassword"
export type PanelView =
  | SelectablePanelView
  | SignedInPanelView
  | "signedIn"
  | "authPending"
  | "passwordResetVerifyEmail"
  | "signUpVerifyEmail"
  | "resetPassword"
type FeedbackKind = "success" | "error"

const canUseCloudSession = computed<boolean>(() => {
  return Boolean(
    props.session &&
    props.runtimeSessionState.syncStatus === "authenticated" &&
    props.session.user.id === props.runtimeSessionState.scope.userId,
  )
})

const selectedPanelView = ref<SelectablePanelView>("signIn")
const signedInPanelView = ref<SignedInPanelView>("main")

const panelView = computed<PanelView>(() => {
  if (passwordResetFlowStep.value === "awaitingCode") return "passwordResetVerifyEmail"
  if (passwordResetFlowStep.value === "settingPassword") return "resetPassword"

  if (signUpFlowStep.value === "awaitingCode") return "signUpVerifyEmail"

  if (isAuthPending(props.runtimeSessionState)) return "authPending"
  if (canUseCloudSession.value) return signedInPanelView.value
  return selectedPanelView.value
})

type PasswordResetFlowStep = "idle" | "awaitingCode" | "settingPassword"
const passwordResetFlowStep = ref<PasswordResetFlowStep>("idle")
const passwordResetRequestEmail = ref("")
const hasActivePasswordResetFlow = computed(() => passwordResetFlowStep.value !== "idle")

type SignUpFlowStep = "idle" | "awaitingCode"
const signUpFlowStep = ref<SignUpFlowStep>("idle")
const signUpRequestEmail = ref("")
const hasActiveSignUpFlow = computed(() => signUpFlowStep.value !== "idle")

const shouldShowActiveFlow = computed<boolean>(
  () => hasActivePasswordResetFlow.value || hasActiveSignUpFlow.value,
)

const signInForm = ref<InstanceType<typeof CloudSyncAccountSignInForm> | null>(null)
const signedInView = ref<InstanceType<typeof CloudSyncAccountSignedInView> | null>(null)
const passwordResetRequestForm = ref<InstanceType<
  typeof CloudSyncAccountPasswordResetRequestForm
> | null>(null)
const passwordResetOtpVerificationForm = ref<InstanceType<
  typeof CloudSyncAccountOtpVerificationForm
> | null>(null)
const signUpOtpVerificationForm = ref<InstanceType<
  typeof CloudSyncAccountOtpVerificationForm
> | null>(null)
const passwordResetForm = ref<InstanceType<typeof CloudSyncAccountPasswordResetForm> | null>(null)

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind | null>(null)
const isLoading = ref(false)

const sessionStateMessage = computed(() => {
  if (isAuthenticated(props.runtimeSessionState)) {
    return "クラウド同期は有効です"
  } else if (isAuthPending(props.runtimeSessionState)) {
    return "クラウド同期の認証状態を確認しています"
  } else if (isSessionLost(props.runtimeSessionState)) {
    return "クラウド同期が停止しています。現在のユーザデータはこの端末に保存されますが、クラウドには反映されません"
  } else {
    return "クラウド同期を使うにはサインインしてください"
  }
})

function showSignInView() {
  selectedPanelView.value = "signIn"
}

function showSignUpView() {
  selectedPanelView.value = "signUp"
}

function showPasswordResetRequestView() {
  selectedPanelView.value = "passwordResetRequest"
}

function showSignedInMainView() {
  signedInPanelView.value = "main"
}

function showPasswordChangeView() {
  signedInPanelView.value = "changePassword"
}

function showPasswordResetForm() {
  passwordResetFlowStep.value = "settingPassword"
}

function startSignUpVerification(email: string) {
  signUpRequestEmail.value = email
  signUpFlowStep.value = "awaitingCode"
}

function startPasswordResetVerification(email: string) {
  passwordResetRequestEmail.value = email
  passwordResetFlowStep.value = "awaitingCode"
}

function clearFeedback() {
  feedbackMessage.value = ""
  feedbackKind.value = null
}

function resetAuthForms() {
  signedInView.value?.reset()
  signInForm.value?.reset()
  passwordResetRequestForm.value?.reset()
  passwordResetOtpVerificationForm.value?.reset()
  signUpOtpVerificationForm.value?.reset()
}

function clearSignUpFlow() {
  signUpOtpVerificationForm.value?.reset()
  signUpRequestEmail.value = ""
  signUpFlowStep.value = "idle"
}

function cancelSignUpFlow() {
  clearSignUpFlow()
  clearFeedback()
  showSignUpView()
}

function clearPasswordResetFlow() {
  passwordResetRequestForm.value?.reset()
  passwordResetForm.value?.reset()
  passwordResetOtpVerificationForm.value?.reset()
  passwordResetRequestEmail.value = ""
  passwordResetFlowStep.value = "idle"
}

function cancelPasswordResetFlow() {
  clearPasswordResetFlow()
  showSignInView()
  clearFeedback()
  props.actions.cancelPasswordRecovery()
}

async function handleSignIn(email: string, password: string): Promise<void> {
  if (isLoading.value) return
  if (validateEmail(email) !== "" || validateRequiredPassword(password) !== "") return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.signInWithEmail(email.trim(), password)
    feedbackMessage.value = "クラウド同期を開始しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleSignUp(email: string, password: string): Promise<void> {
  if (isLoading.value) return
  if (validateEmail(email) !== "" || validateCreatedPassword(password) !== "") return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.signUpWithEmail(email.trim(), password)
    startSignUpVerification(email.trim())

    feedbackMessage.value = "確認メールを送信しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleVerifySignUpCode(code: string): Promise<void> {
  if (isLoading.value) return
  if (validateVerificationCode(code) !== "") return
  if (!signUpRequestEmail.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.verifySignUpCode(signUpRequestEmail.value, code)
    feedbackMessage.value = "認証に成功しました"
    feedbackKind.value = "success"

    clearSignUpFlow()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    signUpOtpVerificationForm.value?.reset()
    isLoading.value = false
  }
}

async function handleResendSignUpCode(): Promise<void> {
  if (isLoading.value) return
  if (!signUpRequestEmail.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.resendSignUpCode(signUpRequestEmail.value)
    feedbackMessage.value = "アカウント作成用のメールを再送しました"
    feedbackKind.value = "success"

    signUpOtpVerificationForm.value?.reset()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleSignOut(): Promise<void> {
  if (isLoading.value) return
  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.signOut()
    feedbackMessage.value = "クラウド同期を停止しました"
    feedbackKind.value = "success"
    showSignInView()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleSync(): Promise<void> {
  if (isLoading.value) return
  if (!canUseCloudSession.value) {
    feedbackMessage.value = "サインイン状態にありません"
    feedbackKind.value = "error"
    return
  }
  feedbackMessage.value = ""
  isLoading.value = true

  try {
    if (!props.actions.syncLogEntries) throw new Error("Cloud sync handler is not configured.")

    const result = await props.actions.syncLogEntries()
    feedbackMessage.value = `同期しました（追加 ${result.addedCount} 件、削除 ${result.deletedCount} 件、アップロード ${result.uploadedCount} 件）`
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleChangePassword(newPassword: string, currentPassword: string) {
  if (
    isLoading.value ||
    validateCreatedPassword(newPassword) !== "" ||
    validateRequiredPassword(currentPassword) !== ""
  )
    return

  isLoading.value = true
  feedbackMessage.value = ""

  try {
    await props.actions.changePassword(newPassword, currentPassword)

    feedbackMessage.value = "パスワードを変更しました"
    feedbackKind.value = "success"

    showSignedInMainView()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handlePasswordResetRequest(email: string) {
  if (validateEmail(email) !== "") return
  if (isLoading.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.sendPasswordResetCode(email)
    feedbackMessage.value = "パスワードリセット用のメールを送信しました"
    feedbackKind.value = "success"

    passwordResetOtpVerificationForm.value?.reset()
    startPasswordResetVerification(email)
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleResendPasswordResetRequest() {
  if (isLoading.value) return
  if (!passwordResetRequestEmail.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.sendPasswordResetCode(passwordResetRequestEmail.value)
    feedbackMessage.value = "パスワードリセット用のメールを再送しました"
    feedbackKind.value = "success"

    passwordResetOtpVerificationForm.value?.reset()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleVerifyPasswordResetCode(code: string) {
  if (isLoading.value) return
  if (validateVerificationCode(code) !== "") return
  if (!passwordResetRequestEmail.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.verifyPasswordResetCode(passwordResetRequestEmail.value, code)
    feedbackMessage.value = "認証に成功しました"
    feedbackKind.value = null

    showPasswordResetForm()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    passwordResetOtpVerificationForm.value?.reset()
    isLoading.value = false
  }
}

async function handlePasswordReset(password: string) {
  if (isLoading.value) return
  if (validateCreatedPassword(password) !== "") return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.updatePasswordAfterRecovery(password)
    feedbackMessage.value = "パスワードを再設定しました"
    feedbackKind.value = null

    clearPasswordResetFlow()
    showSignInView()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleConfirmDeleteCloudSync() {
  if (isLoading.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.deleteCloudSync()
    resetAuthForms()

    feedbackMessage.value = "クラウド同期アカウントを削除しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function reset() {
  showSignInView()

  resetAuthForms()
  clearFeedback()
  isLoading.value = false
}

function handleBack() {
  if (panelView.value === "changePassword") {
    showSignedInMainView()
    return true
  }

  if (panelView.value === "signUp") {
    showSignInView()
    return true
  }

  if (panelView.value === "passwordResetRequest") {
    showSignInView()
    return true
  }

  return false
}

function prepareForDialogOpen() {
  if (!shouldShowActiveFlow.value) {
    showSignInView()
    resetAuthForms()
  }

  clearFeedback()
  isLoading.value = false
}

defineExpose({
  shouldShowActiveFlow,
  prepareForDialogOpen,
  reset,
  handleBack,
})
</script>

<template>
  <div class="container">
    <p class="description" :class="{ 'session-lost': isSessionLost(props.runtimeSessionState) }">
      <span>{{ sessionStateMessage }}</span>
      <span v-if="isAuthenticated(props.runtimeSessionState)">
        サインイン中: {{ props.session?.user.email }}
      </span>
    </p>

    <template v-if="panelView === 'main'">
      <CloudSyncAccountSignedInView
        ref="cloudSyncAccountSignedInView"
        :is-loading="isLoading"
        @sync="handleSync"
        @sign-out="handleSignOut"
        @delete-cloud-sync="handleConfirmDeleteCloudSync"
        @show-password-change-view="showPasswordChangeView"
      />
    </template>

    <template v-else-if="panelView === 'changePassword'">
      <CloudSyncAccountPasswordChangeForm
        ref="cloudSyncAccountPasswordChangeForm"
        :is-loading="isLoading"
        @submit="handleChangePassword"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'signIn'">
      <CloudSyncAccountSignInForm
        ref="cloudSyncAccountSignInForm"
        :is-loading="isLoading"
        @show-password-reset-request="showPasswordResetRequestView"
        @show-sign-up-view="showSignUpView"
        @submit="handleSignIn"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'signUp'">
      <CloudSyncAccountSignUpForm
        :is-loading="isLoading"
        @submit="handleSignUp"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'signUpVerifyEmail'">
      <CloudSyncAccountOtpVerificationForm
        ref="signUpOtpVerificationForm"
        :is-loading="isLoading"
        @cancel="cancelSignUpFlow"
        @submit="handleVerifySignUpCode"
        @resend="handleResendSignUpCode"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'passwordResetRequest'">
      <CloudSyncAccountPasswordResetRequestForm
        ref="cloudSyncAccountPasswordResetRequestForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetFlow"
        @submit="handlePasswordResetRequest"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'passwordResetVerifyEmail'">
      <CloudSyncAccountOtpVerificationForm
        ref="passwordResetOtpVerificationForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetFlow"
        @submit="handleVerifyPasswordResetCode"
        @resend="handleResendPasswordResetRequest"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'resetPassword'">
      <CloudSyncAccountPasswordResetForm
        ref="cloudSyncAccountPasswordResetForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetFlow"
        @submit="handlePasswordReset"
        @edit="clearFeedback"
      />
    </template>

    <output
      v-if="feedbackMessage"
      class="feedback-message"
      :class="feedbackKind"
      role="status"
      aria-live="polite"
    >
      {{ feedbackMessage }}
    </output>
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-3);
}

.description {
  display: grid;
  gap: var(--space-2);

  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-surface);
  background: var(--color-output);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.description.session-lost {
  color: var(--color-text-error);
}

.feedback-message {
  display: block;
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-surface);
  background: var(--color-output);
  color: var(--color-text);
  font-size: var(--font-size-small);
}

.feedback-message.success {
  color: var(--color-text-muted);
}

.feedback-message.error {
  color: var(--color-text-error);
}
</style>
