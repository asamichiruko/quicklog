<script setup lang="ts">
import CloudSyncAccountEmailChangeForm from "@/components/CloudSyncAccountEmailChangeForm.vue"
import CloudSyncAccountEmailChangePendingView from "@/components/CloudSyncAccountEmailChangePendingView.vue"
import CloudSyncAccountOtpVerificationForm from "@/components/CloudSyncAccountOtpVerificationForm.vue"
import CloudSyncAccountPasswordChangeForm from "@/components/CloudSyncAccountPasswordChangeForm.vue"
import CloudSyncAccountPasswordResetForm from "@/components/CloudSyncAccountPasswordResetForm.vue"
import CloudSyncAccountPasswordResetRequestForm from "@/components/CloudSyncAccountPasswordResetRequestForm.vue"
import CloudSyncAccountSignedInView from "@/components/CloudSyncAccountSignedInView.vue"
import CloudSyncAccountSignInForm from "@/components/CloudSyncAccountSignInForm.vue"
import CloudSyncAccountSignUpForm from "@/components/CloudSyncAccountSignUpForm.vue"
import type { AccountUserView } from "@/composables/useAccountUser"
import { useEmailChangeFlow } from "@/composables/useEmailChangeFlow"
import { getAuthFeedbackMessage } from "@/lib/authFeedbackMessage"
import {
  validateRequiredPassword,
  validateCreatedPassword,
  validateEmail,
  validateVerificationCode,
} from "@/lib/authFormValidation"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import { isAuthenticated, isAuthPending, isSessionLost } from "@/lib/runtimeSessionState"
import type { FeedbackKind, RuntimeSessionState } from "@/types"
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
  cancelPasswordRecovery: () => Promise<void>
  requestEmailChange: (newEmail: string) => Promise<void>
  resendEmailChangeConfirmation: (newEmail: string) => Promise<void>
}

const props = defineProps<{
  session: Session | null
  accountUser: AccountUserView
  runtimeSessionState: RuntimeSessionState
  actions: CloudSyncAccountActions
}>()

export type SelectablePanelView = "signIn" | "signUp" | "passwordResetRequest"
export type SignedInPanelView = "main" | "changePassword" | "changeEmail"
export type PanelView =
  | SelectablePanelView
  | SignedInPanelView
  | "signedIn"
  | "authPending"
  | "passwordResetVerifyEmail"
  | "signUpVerifyEmail"
  | "resetPassword"
  | "changeEmailPending"

const canUseCloudSession = computed<boolean>(() => {
  return Boolean(
    props.session &&
    props.runtimeSessionState.syncStatus === "authenticated" &&
    props.session.user.id === props.runtimeSessionState.scope.userId,
  )
})

const selectedPanelView = ref<SelectablePanelView>("signIn")
const signedInPanelView = ref<SignedInPanelView>("main")

type PasswordResetFlowStep = "idle" | "awaitingCode" | "settingPassword"
const passwordResetFlowStep = ref<PasswordResetFlowStep>("idle")
const passwordResetRequestEmail = ref("")
const hasActivePasswordResetFlow = computed(() => passwordResetFlowStep.value !== "idle")

type SignUpFlowStep = "idle" | "awaitingCode"
const signUpFlowStep = ref<SignUpFlowStep>("idle")
const signUpRequestEmail = ref("")
const hasActiveSignUpFlow = computed(() => signUpFlowStep.value !== "idle")

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
const passwordChangeForm = ref<InstanceType<typeof CloudSyncAccountPasswordChangeForm> | null>(null)
const emailChangeForm = ref<InstanceType<typeof CloudSyncAccountEmailChangeForm> | null>(null)

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind | null>(null)
const isLoading = ref(false)

function setFeedback(message: string, kind: FeedbackKind | null) {
  feedbackMessage.value = message
  feedbackKind.value = kind
}

const sessionStateMessage = computed(() => {
  if (isAuthenticated(props.runtimeSessionState)) {
    return "クラウド同期は有効です"
  } else if (isAuthPending(props.runtimeSessionState)) {
    return "クラウド同期の認証状態を確認しています"
  } else if (isSessionLost(props.runtimeSessionState)) {
    return "クラウド同期が停止しています。現在のユーザーデータはこの端末に保存されますが、クラウドには反映されません"
  } else {
    return "クラウド同期を使うにはサインインしてください"
  }
})

const currentEmail = computed(() => {
  if (!canUseCloudSession.value) return ""
  if (props.accountUser.user.value?.id !== props.session?.user.id) return ""
  return props.accountUser.user.value?.email ?? ""
})

const accountUserRefreshDisplay = computed<{
  message: string | null
  actionLabel: string | null
} | null>(() => {
  if (props.accountUser.isLoading.value) {
    return { message: "アカウント情報を取得しています…", actionLabel: null }
  }
  if (props.accountUser.error.value !== null) {
    return {
      message: props.accountUser.user.value
        ? "最新のアカウント情報を取得できませんでした"
        : "アカウント情報を取得できませんでした",
      actionLabel: "再試行",
    }
  }
  if (props.accountUser.user.value === null) {
    return { message: "アカウント情報を確認できていません", actionLabel: "取得" }
  }
  return null
})

const emailChangeFlow = useEmailChangeFlow({
  canUseCloudSession: () => canUseCloudSession.value,
  getAccountUser: () => props.accountUser,
  getCurrentEmail: () => currentEmail.value,
  getSession: () => props.session,
  isLoading: isLoading,
  requestEmailChange: props.actions.requestEmailChange,
  resendEmailChangeConfirmation: props.actions.resendEmailChangeConfirmation,
  setFeedback,
  showSignedInMainView,
})

const shouldShowActiveFlow = computed<boolean>(
  () =>
    hasActivePasswordResetFlow.value ||
    hasActiveSignUpFlow.value ||
    emailChangeFlow.hasActiveEmailChangeFlow.value,
)

const panelView = computed<PanelView>(() => {
  if (passwordResetFlowStep.value === "awaitingCode") return "passwordResetVerifyEmail"
  if (passwordResetFlowStep.value === "settingPassword") return "resetPassword"

  if (signUpFlowStep.value === "awaitingCode") return "signUpVerifyEmail"

  if (isAuthPending(props.runtimeSessionState)) return "authPending"

  if (canUseCloudSession.value) {
    if (emailChangeFlow.emailChangeFlowStep.value === "pending") return "changeEmailPending"
    return signedInPanelView.value
  }
  return selectedPanelView.value
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

function showEmailChangeView() {
  signedInPanelView.value = "changeEmail"
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
  passwordChangeForm.value?.reset()
  emailChangeForm.value?.reset()
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

async function cancelPasswordResetFlow() {
  clearPasswordResetFlow()
  showSignInView()
  clearFeedback()
  await props.actions.cancelPasswordRecovery()
}

function clearEmailChangeFlow() {
  emailChangeForm.value?.reset()
  emailChangeFlow.clear()
}

function leaveEmailChangePendingView() {
  clearEmailChangeFlow()
  showSignedInMainView()
  clearFeedback()
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

function handleReviseEmailChange() {
  emailChangeFlow.revise()
  showEmailChangeView()
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
  clearSignUpFlow()
  clearPasswordResetFlow()
  clearEmailChangeFlow()

  showSignInView()
  showSignedInMainView()

  resetAuthForms()
  clearFeedback()
  isLoading.value = false
}

function handleBack() {
  if (panelView.value === "changePassword" || panelView.value === "changeEmail") {
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

  if (panelView.value === "changeEmailPending") {
    leaveEmailChangePendingView()
    return true
  }

  return false
}

function prepareForDialogOpen() {
  if (!shouldShowActiveFlow.value) {
    showSignInView()
    showSignedInMainView()
    resetAuthForms()
  }

  clearFeedback()
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
    <div class="description">
      <p class="sync-state" :class="{ 'session-lost': isSessionLost(props.runtimeSessionState) }">
        {{ sessionStateMessage }}
      </p>

      <div v-if="canUseCloudSession" class="account-state">
        <p v-if="accountUser.user.value !== null" class="sync-state">
          サインイン中: {{ currentEmail === "" ? "メールアドレス登録なし" : currentEmail }}
        </p>

        <div v-if="accountUserRefreshDisplay" class="account-refresh">
          <p v-if="accountUserRefreshDisplay.message" class="sync-state">
            {{ accountUserRefreshDisplay.message }}
          </p>
          <button
            v-if="accountUserRefreshDisplay.actionLabel"
            type="button"
            class="button-secondary refresh-user-button"
            :disabled="isLoading || props.accountUser.isLoading.value"
            @click="props.accountUser.refresh()"
          >
            {{ accountUserRefreshDisplay.actionLabel }}
          </button>
        </div>
      </div>
    </div>

    <template v-if="panelView === 'main'">
      <CloudSyncAccountSignedInView
        ref="signedInView"
        :is-loading="isLoading"
        :exists-email="currentEmail !== ''"
        @sync="handleSync"
        @sign-out="handleSignOut"
        @delete-cloud-sync="handleConfirmDeleteCloudSync"
        @show-password-change-view="showPasswordChangeView"
        @show-email-change-view="showEmailChangeView"
      />
    </template>

    <template v-else-if="panelView === 'changePassword'">
      <CloudSyncAccountPasswordChangeForm
        ref="passwordChangeForm"
        :is-loading="isLoading"
        @submit="handleChangePassword"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'changeEmail'">
      <CloudSyncAccountEmailChangeForm
        ref="emailChangeForm"
        :is-loading="isLoading"
        :current-email="currentEmail"
        :default-new-email="emailChangeFlow.newEmailAtChangingEmail.value"
        @submit="emailChangeFlow.request"
        @edit="clearFeedback"
      />
    </template>

    <template v-else-if="panelView === 'changeEmailPending'">
      <CloudSyncAccountEmailChangePendingView
        :is-loading="isLoading || accountUser.isLoading.value"
        :current-email="emailChangeFlow.currentEmailAtChangingEmail.value"
        :new-email="emailChangeFlow.newEmailAtChangingEmail.value"
        @revise="handleReviseEmailChange"
        @back="leaveEmailChangePendingView"
        @resend="emailChangeFlow.resend"
        @refresh="emailChangeFlow.refresh"
      />
    </template>

    <template v-else-if="panelView === 'signIn'">
      <CloudSyncAccountSignInForm
        ref="signInForm"
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
        ref="passwordResetRequestForm"
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
        ref="passwordResetForm"
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

.account-state,
.account-refresh {
  display: grid;
  gap: var(--space-2);
}

.sync-state {
  margin: 0;
}

.refresh-user-button {
  width: fit-content;
}

.sync-state.session-lost {
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
