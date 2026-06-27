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
  verifySignUpCode: (email: string, code: string, password: string) => Promise<void>
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
const signUpRequestPassword = ref("") // アカウント作成後のサインインのために一時的に保持、必ず破棄する
const hasActiveSignUpFlow = computed(() => signUpFlowStep.value !== "idle")

const shouldOpenAccountView = computed<boolean>(
  () => hasActivePasswordResetFlow.value || hasActiveSignUpFlow.value,
)

const cloudSyncAccountSignInForm = ref<InstanceType<typeof CloudSyncAccountSignInForm> | null>(null)
const cloudSyncAccountSignUpForm = ref<InstanceType<typeof CloudSyncAccountSignUpForm> | null>(null)
const cloudSyncAccountSignedInView = ref<InstanceType<typeof CloudSyncAccountSignedInView> | null>(
  null,
)
const cloudSyncAccountPasswordResetRequestForm = ref<InstanceType<
  typeof CloudSyncAccountPasswordResetRequestForm
> | null>(null)
const passwordResetOtpVerificationForm = ref<InstanceType<
  typeof CloudSyncAccountOtpVerificationForm
> | null>(null)
const signUpOtpVerificationForm = ref<InstanceType<
  typeof CloudSyncAccountOtpVerificationForm
> | null>(null)
const cloudSyncAccountPasswordResetForm = ref<InstanceType<
  typeof CloudSyncAccountPasswordResetForm
> | null>(null)

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind | null>(null)
const isLoading = ref(false)

function clearFeedbackMessage() {
  feedbackMessage.value = ""
  feedbackKind.value = null
}

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
    signUpRequestEmail.value = email.trim()
    signUpRequestPassword.value = password
    signUpFlowStep.value = "awaitingCode"

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
    await props.actions.verifySignUpCode(
      signUpRequestEmail.value,
      code,
      signUpRequestPassword.value,
    )
    feedbackMessage.value = "認証に成功しました"
    feedbackKind.value = null

    clearSignUpVerification()
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    signUpOtpVerificationForm.value?.reset()
    isLoading.value = false
  }
}

function cancelSignUpVerification() {
  selectedPanelView.value = "signUp"
  clearSignUpVerification()
  clearFeedbackMessage()
}

function clearSignUpVerification() {
  cloudSyncAccountSignUpForm.value?.reset()
  signUpRequestEmail.value = ""
  signUpRequestPassword.value = ""
  signUpFlowStep.value = "idle"
  signUpOtpVerificationForm.value?.reset()
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

    signedInPanelView.value = "main"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handlePasswordResetRequest(email: string) {
  if (validateEmail(email) !== "") return
  passwordResetRequestEmail.value = email

  await passwordResetRequest()
}

async function passwordResetRequest() {
  if (isLoading.value) return
  if (!passwordResetRequestEmail.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.sendPasswordResetCode(passwordResetRequestEmail.value)
    feedbackMessage.value = "パスワードリセット用のメールを送信しました"
    feedbackKind.value = "success"

    passwordResetOtpVerificationForm.value?.reset()
    passwordResetFlowStep.value = "awaitingCode"
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

    passwordResetFlowStep.value = "settingPassword"
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

    clearPasswordResetVerification()
    passwordResetFlowStep.value = "idle"
    selectedPanelView.value = "signIn"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function cancelPasswordResetRecovery() {
  clearPasswordResetVerification()
  selectedPanelView.value = "signIn"
  clearFeedbackMessage()
  props.actions.cancelPasswordRecovery()
}

function cancelPasswordChange() {
  signedInPanelView.value = "main"
}

function clearPasswordResetVerification() {
  cloudSyncAccountPasswordResetRequestForm.value?.reset()
  cloudSyncAccountPasswordResetForm.value?.reset()
  passwordResetOtpVerificationForm.value?.reset()
  passwordResetFlowStep.value = "idle"
}

async function handleConfirmDeleteCloudSync() {
  if (isLoading.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.actions.deleteCloudSync()
    resetAuthFormState()
    feedbackMessage.value = "クラウド同期アカウントを削除しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function handleChangeView(view: SelectablePanelView) {
  selectedPanelView.value = view
}

function handleChangeSignedInView(view: SignedInPanelView) {
  signedInPanelView.value = view
}

function resetAuthFormState() {
  cloudSyncAccountSignedInView.value?.reset()
  cloudSyncAccountSignInForm.value?.reset()
  cloudSyncAccountSignUpForm.value?.reset()
  cloudSyncAccountPasswordResetRequestForm.value?.reset()
  passwordResetOtpVerificationForm.value?.reset()
  signUpOtpVerificationForm.value?.reset()

  clearFeedbackMessage()
  isLoading.value = false
}

function reset() {
  selectedPanelView.value = "signIn"
  resetAuthFormState()
}

function prepareForDialogOpen() {
  if (shouldOpenAccountView.value) {
    clearFeedbackMessage()
    isLoading.value = false
    return
  } else {
    reset()
  }
}

defineExpose({
  shouldOpenAccountView,
  prepareForDialogOpen,
  reset,
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
        @change-view="handleChangeSignedInView"
      />
    </template>

    <template v-else-if="panelView === 'changePassword'">
      <CloudSyncAccountPasswordChangeForm
        ref="cloudSyncAccountPasswordChangeForm"
        :is-loading="isLoading"
        @submit="handleChangePassword"
        @cancel="cancelPasswordChange"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'signIn'">
      <CloudSyncAccountSignInForm
        ref="cloudSyncAccountSignInForm"
        :is-loading="isLoading"
        @change-view="handleChangeView"
        @submit="handleSignIn"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'signUp'">
      <CloudSyncAccountSignUpForm
        ref="cloudSyncAccountSignUpForm"
        :is-loading="isLoading"
        @change-view="handleChangeView"
        @submit="handleSignUp"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'signUpVerifyEmail'">
      <CloudSyncAccountOtpVerificationForm
        ref="signUpOtpVerificationForm"
        :is-loading="isLoading"
        @cancel="cancelSignUpVerification"
        @submit="handleVerifySignUpCode"
        @resend="handleResendSignUpCode"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'passwordResetRequest'">
      <CloudSyncAccountPasswordResetRequestForm
        ref="cloudSyncAccountPasswordResetRequestForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetRecovery"
        @submit="handlePasswordResetRequest"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'passwordResetVerifyEmail'">
      <CloudSyncAccountOtpVerificationForm
        ref="passwordResetOtpVerificationForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetRecovery"
        @submit="handleVerifyPasswordResetCode"
        @resend="handleResendPasswordResetRequest"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'resetPassword'">
      <CloudSyncAccountPasswordResetForm
        ref="cloudSyncAccountPasswordResetForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetRecovery"
        @submit="handlePasswordReset"
        @edit="clearFeedbackMessage"
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
  border: 1px solid var(--color-border);
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
