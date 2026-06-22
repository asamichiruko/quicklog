<script setup lang="ts">
import CloudSyncAccountOtpVerificationForm from "@/components/CloudSyncAccountOtpVerificationForm.vue"
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

const props = defineProps<{
  session: Session | null
  runtimeSessionState: RuntimeSessionState
  syncLogEntries?: () => Promise<CloudQuicklogDataSyncResult>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  deleteCloudSync: () => Promise<void>
  sendPasswordResetCode: (email: string) => Promise<void>
  verifyPasswordResetCode: (email: string, code: string) => Promise<void>
  updatePasswordAfterRecovery: (password: string) => Promise<void>
}>()

const emit = defineEmits<{
  cancelPasswordRecovery: []
}>()

export type SelectablePanelView = "signIn" | "signUp" | "passwordResetRequest"
export type PanelView =
  | SelectablePanelView
  | "signedIn"
  | "authPending"
  | "verifyEmail"
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
const panelView = computed<PanelView>(() => {
  if (passwordResetFlowStep.value === "awaitingCode") return "verifyEmail"
  if (passwordResetFlowStep.value === "settingPassword") return "resetPassword"
  if (isAuthPending(props.runtimeSessionState)) return "authPending"
  if (canUseCloudSession.value) return "signedIn"
  return selectedPanelView.value
})

type PasswordResetFlowStep = "idle" | "awaitingCode" | "settingPassword"
const passwordResetFlowStep = ref<PasswordResetFlowStep>("idle")
const passwordResetRequestEmail = ref("")
const hasActivePasswordResetFlow = computed(() => passwordResetFlowStep.value !== "idle")

const cloudSyncAccountSignInForm = ref<InstanceType<typeof CloudSyncAccountSignInForm> | null>(null)
const cloudSyncAccountSignUpForm = ref<InstanceType<typeof CloudSyncAccountSignUpForm> | null>(null)
const cloudSyncAccountSignedInView = ref<InstanceType<typeof CloudSyncAccountSignedInView> | null>(
  null,
)
const cloudSyncAccountPasswordResetRequestForm = ref<InstanceType<
  typeof CloudSyncAccountPasswordResetRequestForm
> | null>(null)
const cloudSyncAccountOtpVerificationForm = ref<InstanceType<
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
    await props.signInWithEmail(email.trim(), password)
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
    await props.signUpWithEmail(email.trim(), password)
    feedbackMessage.value = "アカウントを作成しました"
    feedbackKind.value = "success"
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
    await props.signOut()
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
    if (!props.syncLogEntries) throw new Error("Cloud sync handler is not configured.")

    const result = await props.syncLogEntries()
    feedbackMessage.value = `同期しました（追加 ${result.addedCount} 件、削除 ${result.deletedCount} 件、アップロード ${result.uploadedCount} 件）`
    feedbackKind.value = "success"
  } catch {
    feedbackMessage.value = "同期に失敗しました"
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
    await props.sendPasswordResetCode(passwordResetRequestEmail.value)
    feedbackMessage.value = "パスワードリセット用のメールを送信しました"
    feedbackKind.value = "success"

    cloudSyncAccountOtpVerificationForm.value?.reset()
    passwordResetFlowStep.value = "awaitingCode"
  } catch {
    feedbackMessage.value = "パスワードリセット用のメールの送信に失敗しました"
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
    await props.sendPasswordResetCode(passwordResetRequestEmail.value)
    feedbackMessage.value = "パスワードリセット用のメールを再送しました"
    feedbackKind.value = "success"

    cloudSyncAccountOtpVerificationForm.value?.reset()
  } catch {
    feedbackMessage.value = "パスワードリセット用のメールの送信に失敗しました"
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleVerifyEmail(verificationCode: string) {
  if (isLoading.value) return
  if (validateVerificationCode(verificationCode) !== "") return
  if (!passwordResetRequestEmail.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.verifyPasswordResetCode(passwordResetRequestEmail.value, verificationCode)
    feedbackMessage.value = "認証に成功しました"
    feedbackKind.value = null

    passwordResetFlowStep.value = "settingPassword"
  } catch {
    feedbackMessage.value = "認証に失敗しました。確認コードが正しいかお確かめください"
    feedbackKind.value = "error"
  } finally {
    cloudSyncAccountOtpVerificationForm.value?.reset()
    isLoading.value = false
  }
}

async function handlePasswordReset(password: string) {
  if (isLoading.value) return
  if (validateCreatedPassword(password) !== "") return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.updatePasswordAfterRecovery(password)
    feedbackMessage.value = "パスワードを再設定しました"
    feedbackKind.value = null

    clearPasswordResetVerification()
    passwordResetFlowStep.value = "idle"
    selectedPanelView.value = "signIn"
  } catch {
    feedbackMessage.value = "パスワードの再設定に失敗しました。時間をおいて再度お試しください"
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function cancelPasswordReset() {
  clearPasswordResetVerification()
  selectedPanelView.value = "signIn"
  clearFeedbackMessage()
  emit("cancelPasswordRecovery")
}

function cancelPasswordResetVerification() {
  clearPasswordResetVerification()
  selectedPanelView.value = "signIn"
  clearFeedbackMessage()
  emit("cancelPasswordRecovery")
}

function clearPasswordResetVerification() {
  cloudSyncAccountPasswordResetRequestForm.value?.reset()
  cloudSyncAccountPasswordResetForm.value?.reset()
  passwordResetFlowStep.value = "idle"
}

async function handleConfirmDeleteCloudSync() {
  if (isLoading.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.deleteCloudSync()
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

function resetAuthFormState() {
  cloudSyncAccountSignedInView.value?.reset()
  cloudSyncAccountSignInForm.value?.reset()
  cloudSyncAccountSignUpForm.value?.reset()
  cloudSyncAccountPasswordResetRequestForm.value?.reset()
  cloudSyncAccountOtpVerificationForm.value?.reset()

  clearFeedbackMessage()
  isLoading.value = false
}

function reset() {
  selectedPanelView.value = "signIn"
  resetAuthFormState()
}

function prepareForDialogOpen() {
  if (passwordResetFlowStep.value === "awaitingCode") {
    clearFeedbackMessage()
    isLoading.value = false
    return
  }
  if (passwordResetFlowStep.value === "settingPassword") {
    clearFeedbackMessage()
    isLoading.value = false
    return
  }

  reset()
}

defineExpose({
  hasActivePasswordResetFlow,
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

    <template v-if="panelView === 'signedIn'">
      <CloudSyncAccountSignedInView
        ref="cloudSyncAccountSignedInView"
        :is-loading="isLoading"
        @sync="handleSync"
        @sign-out="handleSignOut"
        @delete-cloud-sync="handleConfirmDeleteCloudSync"
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

    <template v-else-if="panelView === 'passwordResetRequest'">
      <CloudSyncAccountPasswordResetRequestForm
        ref="cloudSyncAccountPasswordResetRequestForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetVerification"
        @submit="handlePasswordResetRequest"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'verifyEmail'">
      <CloudSyncAccountOtpVerificationForm
        ref="cloudSyncAccountOtpVerificationForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordResetVerification"
        @submit="handleVerifyEmail"
        @resend="handleResendPasswordResetRequest"
        @edit="clearFeedbackMessage"
      />
    </template>

    <template v-else-if="panelView === 'resetPassword'">
      <CloudSyncAccountPasswordResetForm
        ref="cloudSyncAccountPasswordResetForm"
        :is-loading="isLoading"
        @cancel="cancelPasswordReset"
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
  gap: var(--space-2);
}

.description {
  display: grid;
  gap: var(--space-1);

  margin: 0;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-surface);
  background: var(--color-page);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.description.session-lost {
  color: var(--color-error);
}

.feedback-message {
  display: block;
  margin: 0;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-page);
  color: var(--color-text);
  font-size: var(--font-size-small);
}

.feedback-message.success {
  color: var(--color-text-muted);
}

.feedback-message.error {
  color: var(--color-error);
}
</style>
