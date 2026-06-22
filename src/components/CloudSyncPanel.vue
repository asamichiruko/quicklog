<script setup lang="ts">
import { getAuthFeedbackMessage } from "@/lib/authFeedbackMessage"
import {
  validateCreatedPassword,
  validateEmail,
  validateRequiredPassword,
  validateVerificationCode,
} from "@/lib/authFormValidation"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import { isAuthenticated, isAuthPending, isSessionLost } from "@/lib/runtimeSessionState"
import type { RuntimeSessionState } from "@/types"
import type { Session } from "@supabase/supabase-js"
import { computed, nextTick, ref } from "vue"

const props = defineProps<{
  session: Session | null
  syncLogEntries?: () => Promise<CloudQuicklogDataSyncResult>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  runtimeSessionState: RuntimeSessionState
  deleteCloudSync: () => Promise<void>
}>()

type SelectablePanelView = "signIn" | "signUp" | "resetPassword" | "verifyEmail"
type PanelView = SelectablePanelView | "signedIn" | "authPending"
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
  if (isAuthPending(props.runtimeSessionState)) return "authPending"
  if (canUseCloudSession.value) return "signedIn"
  if (isAwaitingPasswordResetVerification.value) return "verifyEmail"
  return selectedPanelView.value
})
const isConfirmingCloudSyncDeletion = ref(false)
const isAwaitingPasswordResetVerification = ref(false)

const signInEmail = ref("")
const signInPassword = ref("")
const signUpEmail = ref("")
const signUpPassword = ref("")
const passwordResetRequestEmail = ref("")
const verificationCode = ref("")

const signInEmailErrorMessage = ref("")
const signInPasswordErrorMessage = ref("")
const signUpEmailErrorMessage = ref("")
const signUpPasswordErrorMessage = ref("")
const passwordResetRequestEmailErrorMessage = ref("")
const verificationCodeErrorMessage = ref("")

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind | null>(null)
const isLoading = ref(false)

function clearFeedbackMessage() {
  feedbackMessage.value = ""
  feedbackKind.value = null
}

function validateSignInEmail() {
  signInEmailErrorMessage.value = validateEmail(signInEmail.value)
}

function validateSignInPassword() {
  signInPasswordErrorMessage.value = validateRequiredPassword(signInPassword.value)
}

function validateSignUpEmail() {
  signUpEmailErrorMessage.value = validateEmail(signUpEmail.value)
}

function validateSignUpPassword() {
  signUpPasswordErrorMessage.value = validateCreatedPassword(signUpPassword.value)
}

function validatePasswordResetRequestEmail() {
  passwordResetRequestEmailErrorMessage.value = validateEmail(passwordResetRequestEmail.value)
}

function validateEmailVerificationCode() {
  verificationCodeErrorMessage.value = validateVerificationCode(verificationCode.value)
}

function validateSignInFields(): boolean {
  signInEmailErrorMessage.value = validateEmail(signInEmail.value)
  signInPasswordErrorMessage.value = validateRequiredPassword(signInPassword.value)

  return !signInEmailErrorMessage.value && !signInPasswordErrorMessage.value
}

function validateSignUpFields(): boolean {
  signUpEmailErrorMessage.value = validateEmail(signUpEmail.value)
  signUpPasswordErrorMessage.value = validateCreatedPassword(signUpPassword.value)

  return !signUpEmailErrorMessage.value && !signUpPasswordErrorMessage.value
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

const canSignIn = computed(() => {
  return (
    !isLoading.value &&
    !validateEmail(signInEmail.value) &&
    !validateRequiredPassword(signInPassword.value) &&
    !signInEmailErrorMessage.value &&
    !signInPasswordErrorMessage.value
  )
})

const canSignUp = computed(() => {
  return (
    !isLoading.value &&
    !validateEmail(signUpEmail.value) &&
    !validateCreatedPassword(signUpPassword.value) &&
    !signUpEmailErrorMessage.value &&
    !signUpPasswordErrorMessage.value
  )
})

const canPasswordResetRequest = computed(() => {
  return (
    !isLoading.value &&
    !validateEmail(passwordResetRequestEmail.value) &&
    !passwordResetRequestEmailErrorMessage.value
  )
})

const canVerifyEmail = computed(() => {
  return (
    !isLoading.value &&
    !validateVerificationCode(verificationCode.value) &&
    !verificationCodeErrorMessage.value
  )
})

async function handleSignUp(): Promise<void> {
  if (isLoading.value) return
  if (!validateSignUpFields()) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.signUpWithEmail(signUpEmail.value.trim(), signUpPassword.value)
    feedbackMessage.value = "アカウントを作成しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleSignIn(): Promise<void> {
  if (isLoading.value) return
  if (!validateSignInFields()) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.signInWithEmail(signInEmail.value.trim(), signInPassword.value)
    feedbackMessage.value = "クラウド同期を開始しました"
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

function showSignUpView() {
  resetAuthFormState()
  selectedPanelView.value = "signUp"
}

function showSignInView() {
  resetAuthFormState()
  selectedPanelView.value = "signIn"
}

function showResetPasswordView() {
  resetAuthFormState()
  selectedPanelView.value = "resetPassword"
}

async function handlePasswordResetRequest() {
  if (isLoading.value) return
  validatePasswordResetRequestEmail()
  if (passwordResetRequestEmailErrorMessage.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await nextTick() // パスワードリセット用のメールを送信する
    feedbackMessage.value = "パスワードリセット用のメールを送信しました"
    feedbackKind.value = "success"
    isAwaitingPasswordResetVerification.value = true
    verificationCode.value = ""
    verificationCodeErrorMessage.value = ""
    selectedPanelView.value = "verifyEmail"
  } catch {
    feedbackMessage.value = "パスワードリセット用のメールの送信に失敗しました"
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleVerifyEmail() {
  if (isLoading.value) return
  validateEmailVerificationCode()
  if (verificationCodeErrorMessage.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await nextTick() // パスワードのリセットを承認する
    feedbackMessage.value = "パスワードをリセットしました"
    feedbackKind.value = "success"
    clearPasswordResetVerification()
    selectedPanelView.value = "signIn"
  } catch {
    feedbackMessage.value =
      "パスワードのリセットに失敗しました。確認コードが正しいかお確かめください"
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function cancelPasswordResetVerification() {
  clearPasswordResetVerification()
  selectedPanelView.value = "signIn"
  clearFeedbackMessage()
}

function clearPasswordResetVerification() {
  isAwaitingPasswordResetVerification.value = false
  passwordResetRequestEmail.value = ""
  verificationCode.value = ""
  passwordResetRequestEmailErrorMessage.value = ""
  verificationCodeErrorMessage.value = ""
}

function showCloudSyncDeletionConfirmation() {
  isConfirmingCloudSyncDeletion.value = true
}

function hideCloudSyncDeletionConfirmation() {
  isConfirmingCloudSyncDeletion.value = false
}

async function handleConfirmDeleteCloudSync() {
  if (isLoading.value || !isConfirmingCloudSyncDeletion.value) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await props.deleteCloudSync()
    resetAuthFormState()
    feedbackMessage.value = "クラウド同期アカウントを削除しました"
    feedbackKind.value = "success"
    isConfirmingCloudSyncDeletion.value = false
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function resetAuthFormState() {
  signInEmail.value = ""
  signInPassword.value = ""
  signUpEmail.value = ""
  signUpPassword.value = ""
  passwordResetRequestEmail.value = ""
  verificationCode.value = ""

  signInEmailErrorMessage.value = ""
  signInPasswordErrorMessage.value = ""
  signUpEmailErrorMessage.value = ""
  signUpPasswordErrorMessage.value = ""
  passwordResetRequestEmailErrorMessage.value = ""
  verificationCodeErrorMessage.value = ""

  clearFeedbackMessage()
  isLoading.value = false
}

function reset() {
  selectedPanelView.value = "signIn"
  isAwaitingPasswordResetVerification.value = false

  isConfirmingCloudSyncDeletion.value = false
  resetAuthFormState()
}

function prepareForDialogOpen() {
  if (isAwaitingPasswordResetVerification.value) {
    selectedPanelView.value = "verifyEmail"
    isConfirmingCloudSyncDeletion.value = false
    clearFeedbackMessage()
    isLoading.value = false
    return
  }

  reset()
}

defineExpose({
  hasPendingPasswordResetVerification: isAwaitingPasswordResetVerification,
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
      <h4 class="panel-heading">クラウド同期</h4>
      <button
        type="button"
        class="button-secondary sync-button"
        :disabled="isLoading"
        @click="handleSync"
      >
        同期
      </button>
      <button
        type="button"
        class="button-secondary sign-out-button"
        :disabled="isLoading"
        @click="handleSignOut"
      >
        サインアウト
      </button>
      <button
        type="button"
        class="button-link show-delete-cloud-data-button"
        :disabled="isLoading || isConfirmingCloudSyncDeletion"
        @click="showCloudSyncDeletionConfirmation"
      >
        クラウド同期アカウントとデータを削除
      </button>
      <template v-if="isConfirmingCloudSyncDeletion">
        <p class="delete-cloud-sync-description">
          現在サインインしているクラウド同期アカウントと、クラウド上の同期データを削除します。この端末に保存されている記録は、サインインしていない状態のデータとして残ります。
        </p>
        <p class="confirm-message">
          クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？
        </p>
        <div class="confirm-actions">
          <button
            type="button"
            class="button-secondary hide-delete-cloud-sync-button"
            :disabled="isLoading"
            @click="hideCloudSyncDeletionConfirmation"
          >
            キャンセル
          </button>
          <button
            type="button"
            class="button-danger delete-cloud-sync-button"
            :disabled="isLoading"
            @click="handleConfirmDeleteCloudSync"
          >
            削除する
          </button>
        </div>
      </template>
    </template>

    <form v-else-if="panelView === 'signIn'" class="account-form" @submit.prevent="handleSignIn">
      <h4 class="panel-heading">サインイン</h4>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">メールアドレス</span>
          <input
            v-model="signInEmail"
            name="sign-in-email"
            type="email"
            class="account-input"
            placeholder="メールアドレスを入力"
            aria-describedby="sign-in-email-error"
            :aria-invalid="Boolean(signInEmailErrorMessage)"
            @input="clearFeedbackMessage"
            @blur="validateSignInEmail"
          />
        </label>
        <p v-if="signInEmailErrorMessage" id="sign-in-email-error" class="field-error">
          {{ signInEmailErrorMessage }}
        </p>
      </div>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">パスワード</span>
          <input
            v-model="signInPassword"
            name="sign-in-password"
            type="password"
            class="account-input"
            placeholder="パスワードを入力"
            aria-describedby="sign-in-password-error"
            :aria-invalid="Boolean(signInPasswordErrorMessage)"
            @input="clearFeedbackMessage"
            @blur="validateSignInPassword"
          />
        </label>
        <p v-if="signInPasswordErrorMessage" id="sign-in-password-error" class="field-error">
          {{ signInPasswordErrorMessage }}
        </p>
      </div>
      <div class="account-actions">
        <button type="submit" class="button-secondary sign-in-button" :disabled="!canSignIn">
          サインイン
        </button>
        <button
          type="button"
          class="button-link change-mode-button"
          :disabled="isLoading"
          @click="showSignUpView"
        >
          アカウントを作成する
        </button>
        <button
          type="button"
          class="button-link change-mode-button"
          :disabled="isLoading"
          @click="showResetPasswordView"
        >
          パスワードを忘れた場合
        </button>
      </div>
    </form>

    <form v-else-if="panelView === 'signUp'" class="account-form" @submit.prevent="handleSignUp">
      <h4 class="panel-heading">アカウント作成</h4>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">メールアドレス</span>
          <input
            v-model="signUpEmail"
            name="sign-up-email"
            type="email"
            class="account-input"
            placeholder="メールアドレスを入力"
            aria-describedby="sign-up-email-error"
            :aria-invalid="Boolean(signUpEmailErrorMessage)"
            @input="clearFeedbackMessage"
            @blur="validateSignUpEmail"
          />
        </label>
        <p v-if="signUpEmailErrorMessage" id="sign-up-email-error" class="field-error">
          {{ signUpEmailErrorMessage }}
        </p>
      </div>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">パスワード</span>
          <input
            v-model="signUpPassword"
            name="sign-up-password"
            type="password"
            class="account-input"
            placeholder="パスワードを入力"
            aria-describedby="sign-up-password-error"
            :aria-invalid="Boolean(signUpPasswordErrorMessage)"
            @input="clearFeedbackMessage"
            @blur="validateSignUpPassword"
          />
        </label>
        <p class="password-rules">英大小文字、数字、記号を含む 8 文字以上</p>
        <p v-if="signUpPasswordErrorMessage" id="sign-up-password-error" class="field-error">
          {{ signUpPasswordErrorMessage }}
        </p>
      </div>
      <div class="account-actions">
        <button type="submit" class="button-secondary sign-up-button" :disabled="!canSignUp">
          アカウントを作成
        </button>
        <button
          type="button"
          class="button-link change-mode-button"
          :disabled="isLoading"
          @click="showSignInView"
        >
          サインインに戻る
        </button>
      </div>
    </form>

    <form
      v-else-if="panelView === 'resetPassword'"
      class="account-form"
      @submit.prevent="handlePasswordResetRequest"
    >
      <h4 class="panel-heading">パスワードリセット</h4>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">メールアドレス</span>
          <input
            v-model="passwordResetRequestEmail"
            type="email"
            name="password-reset-request-input"
            class="account-input"
            placeholder="メールアドレスを入力"
            aria-describedby="password-reset-request-email-error"
            :aria-invalid="Boolean(passwordResetRequestEmailErrorMessage)"
            @input="clearFeedbackMessage"
            @blur="validatePasswordResetRequestEmail"
          />
        </label>
        <p
          v-if="passwordResetRequestEmailErrorMessage"
          id="password-reset-request-email-error"
          class="field-error"
        >
          {{ passwordResetRequestEmailErrorMessage }}
        </p>
      </div>
      <div class="account-actions">
        <button
          type="submit"
          class="button-secondary reset-password-button"
          :disabled="!canPasswordResetRequest"
        >
          パスワードリセット
        </button>
        <button
          type="button"
          class="button-link change-mode-button"
          :disabled="isLoading"
          @click="showSignInView"
        >
          サインインに戻る
        </button>
      </div>
    </form>

    <form
      v-else-if="panelView === 'verifyEmail'"
      class="account-form"
      @submit.prevent="handleVerifyEmail"
    >
      <h4 class="panel-heading">メールアドレス確認</h4>
      <p class="email-verify-description">送信された確認コードを入力してください</p>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">確認コード</span>
          <input
            v-model="verificationCode"
            type="text"
            name="verification-code"
            class="account-input"
            placeholder="確認コードを入力"
            aria-describedby="verification-code-error"
            :aria-invalid="Boolean(verificationCodeErrorMessage)"
            @input="clearFeedbackMessage"
            @blur="validateEmailVerificationCode"
          />
        </label>
        <p v-if="verificationCodeErrorMessage" id="verification-code-error" class="field-error">
          {{ verificationCodeErrorMessage }}
        </p>
      </div>
      <div class="account-actions">
        <button
          type="submit"
          class="button-secondary verify-email-button"
          :disabled="!canVerifyEmail"
        >
          確認する
        </button>

        <button
          type="button"
          class="button-link change-mode-button"
          :disabled="!canPasswordResetRequest"
          @click="handlePasswordResetRequest"
        >
          確認メールを再送する
        </button>
        <button
          type="button"
          class="button-link cancel-reset-password-button"
          :disabled="isLoading"
          @click="cancelPasswordResetVerification"
        >
          パスワードリセットを中止
        </button>
      </div>
    </form>

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

.panel-heading {
  font-size: var(--font-size-medium);
  padding: 0;
  margin: 0;
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

.account-field {
  display: grid;
  gap: 4px;
}

.account-form {
  display: grid;
  gap: var(--space-2);
}

.account-label {
  display: grid;
  gap: 4px;
}

.account-label-text {
  font-weight: var(--font-weight-bold);
}

.account-input {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

.account-input::placeholder {
  color: var(--color-text-subtle);
}

.field-error {
  margin: 0;
  padding: 0;
  color: var(--color-error);
}

.password-rules {
  margin: 0;
  padding: 0;
  font-size: var(--font-size-small);
}

.email-verify-description {
  margin: 0;
  padding: 0;
  font-size: var(--font-size-small);
}

.account-actions {
  display: grid;
  justify-items: start;
  gap: var(--space-1);
}

.delete-cloud-sync-description {
  margin: 0;
  font-size: var(--font-size-small);
}

.confirm-message {
  margin: 0;
  color: var(--color-error);
}

.confirm-actions {
  display: flex;
  gap: var(--space-2);
}

button {
  width: fit-content;
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
