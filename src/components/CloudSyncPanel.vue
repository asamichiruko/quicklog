<script setup lang="ts">
import { signInWithEmail, signOut, signUpWithEmail } from "@/lib/auth"
import type { Session } from "@supabase/supabase-js"
import { computed, ref } from "vue"

const props = defineProps<{
  session: Session | null
}>()

type PanelMode = "signIn" | "signUp"
type FeedbackKind = "success" | "error"

const mode = ref<PanelMode>("signIn")

const signInEmail = ref("")
const signInPassword = ref("")
const signUpEmail = ref("")
const signUpPassword = ref("")

const signInEmailErrorMessage = ref("")
const signInPasswordErrorMessage = ref("")
const signUpEmailErrorMessage = ref("")
const signUpPasswordErrorMessage = ref("")

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind | null>(null)
const isLoading = ref(false)

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  email_not_confirmed: "メールアドレスの確認が完了していません。メールをご確認ください",
  email_exists: "登録できませんでした。入力内容を確認してください",
  user_already_exists: "登録できませんでした。入力内容を確認してください",
  weak_password: "パスワードが条件を満たしていません",
  signup_disabled: "現在、メールアドレスでの新規登録は利用できません",
  email_provider_disabled: "現在、メールアドレスでの新規登録は利用できません",
  over_request_rate_limit: "試行回数が多すぎます。しばらく待ってから再度お試しください",
  over_email_send_rate_limit: "メール送信回数が多すぎます。しばらく待ってから再度お試しください",
  request_timeout: "タイムアウトしました。通信状況を確認して再度お試しください",
  unexpected_failure: "認証サービスで問題が発生しました。時間をおいて再度お試しください",
}

const EMAIL_VALIDATION_REGEXP =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const PASSWORD_MIN_LENGTH = 8

function validateEmail(value: string): string {
  const email = value.trim()
  if (!email) return "メールアドレスを入力してください"
  if (!EMAIL_VALIDATION_REGEXP.test(email)) return "正しい形式のメールアドレスを入力してください"
  return ""
}

function validateRequiredPassword(value: string): string {
  if (!value) return "パスワードを入力してください"
  return ""
}

function validateCreatedPassword(value: string): string {
  if (!value) return "パスワードを入力してください"
  if (value.length < PASSWORD_MIN_LENGTH)
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で作成してください`
  if (
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[\!@#$%\^&\*\(\)_\+\-=\[\]\{\};':"|<>\?,\.\/`~\.]/.test(value)
  ) {
    return "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください"
  }
  return ""
}

function clearFeedbackMessage() {
  feedbackMessage.value = ""
  feedbackKind.value = null
}

function getAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined
  }

  const maybeError = error as { code?: unknown }

  return typeof maybeError.code === "string" ? maybeError.code : undefined
}

function getAuthFeedbackMessage(error: unknown): string {
  const code = getAuthErrorCode(error)

  if (code !== undefined && AUTH_ERROR_MESSAGES[code] !== undefined) {
    return AUTH_ERROR_MESSAGES[code]
  }

  if (import.meta.env.DEV) {
    console.warn("Unhandled auth error:", error)
  }

  return "認証処理に失敗しました。時間をおいて再度お試しください"
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

async function handleSignUp(): Promise<void> {
  if (isLoading.value) return
  if (!validateSignUpFields()) return

  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await signUpWithEmail(signUpEmail.value.trim(), signUpPassword.value)
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
    await signInWithEmail(signInEmail.value.trim(), signInPassword.value)
    feedbackMessage.value = "サインインしました"
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
    await signOut()
    feedbackMessage.value = "サインアウトしました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getAuthFeedbackMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function handleToggleMode() {
  if (mode.value === "signIn") {
    reset()
    mode.value = "signUp"
  } else {
    reset()
    mode.value = "signIn"
  }
}

function reset() {
  mode.value = "signIn"

  signInEmail.value = ""
  signInPassword.value = ""
  signUpEmail.value = ""
  signUpPassword.value = ""

  signInEmailErrorMessage.value = ""
  signInPasswordErrorMessage.value = ""
  signUpEmailErrorMessage.value = ""
  signUpPasswordErrorMessage.value = ""

  clearFeedbackMessage()
  isLoading.value = false
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <template v-if="props.session">
      <p class="description">
        クラウド同期は有効です<br />
        サインイン中: {{ session?.user.email }}
      </p>
      <button
        type="button"
        class="button-secondary sign-out-button"
        @click="handleSignOut"
        :disabled="isLoading"
      >
        サインアウト
      </button>
    </template>
    <template v-else-if="mode === 'signIn'">
      <p class="description">クラウド同期を使うにはサインインしてください</p>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">メールアドレス</span>
          <input
            name="sign-in-email"
            type="email"
            class="account-input"
            placeholder="メールアドレスを入力"
            v-model="signInEmail"
            @input="clearFeedbackMessage"
            @blur="validateSignInEmail"
            aria-describedby="sign-in-email-error"
            :aria-invalid="Boolean(signInEmailErrorMessage)"
          />
        </label>
        <p class="field-error" id="sign-in-email-error" v-if="signInEmailErrorMessage">
          {{ signInEmailErrorMessage }}
        </p>
      </div>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">パスワード</span>
          <input
            name="sign-in-password"
            type="password"
            class="account-input"
            placeholder="パスワードを入力"
            v-model="signInPassword"
            @input="clearFeedbackMessage"
            @blur="validateSignInPassword"
            aria-describedby="sign-in-password-error"
            :aria-invalid="Boolean(signInPasswordErrorMessage)"
          />
        </label>
        <p class="field-error" id="sign-in-password-error" v-if="signInPasswordErrorMessage">
          {{ signInPasswordErrorMessage }}
        </p>
      </div>
      <div class="account-actions">
        <button
          type="button"
          class="button-secondary sign-in-button"
          @click="handleSignIn"
          :disabled="!canSignIn"
        >
          サインイン
        </button>
        <button
          type="button"
          class="button-link toggle-mode-button"
          @click="handleToggleMode"
          :disabled="isLoading"
        >
          アカウントを作成する
        </button>
      </div>
    </template>
    <template v-else>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">メールアドレス</span>
          <input
            name="sign-up-email"
            type="email"
            class="account-input"
            placeholder="メールアドレスを入力"
            v-model="signUpEmail"
            @input="clearFeedbackMessage"
            @blur="validateSignUpEmail"
            aria-describedby="sign-up-email-error"
            :aria-invalid="Boolean(signUpEmailErrorMessage)"
          />
        </label>
        <p class="field-error" id="sign-up-email-error" v-if="signUpEmailErrorMessage">
          {{ signUpEmailErrorMessage }}
        </p>
      </div>
      <div class="account-field">
        <label class="account-label">
          <span class="account-label-text">パスワード</span>
          <input
            name="sign-up-password"
            type="password"
            class="account-input"
            placeholder="パスワードを入力"
            v-model="signUpPassword"
            @input="clearFeedbackMessage"
            @blur="validateSignUpPassword"
            aria-describedby="sign-up-password-error"
            :aria-invalid="Boolean(signUpPasswordErrorMessage)"
          />
        </label>
        <p class="password-rules">英大小文字、数字、記号を含む 8 文字以上</p>
        <p class="field-error" id="sign-up-password-error" v-if="signUpPasswordErrorMessage">
          {{ signUpPasswordErrorMessage }}
        </p>
      </div>
      <div class="account-actions">
        <button
          type="button"
          class="button-secondary sign-up-button"
          @click="handleSignUp"
          :disabled="!canSignUp"
        >
          アカウントを作成
        </button>
        <button
          type="button"
          class="button-link toggle-mode-button"
          @click="handleToggleMode"
          :disabled="isLoading"
        >
          サインインする
        </button>
      </div>
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
  padding: 0;
  margin: 0;
  font-size: var(--font-size-small);
}

.account-field {
  display: grid;
  gap: 4px;
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
  color: hsl(0, 90%, 50%);
}

.password-rules {
  margin: 0;
  padding: 0;
  font-size: var(--font-size-small);
}

.account-actions {
  display: grid;
  justify-items: start;
  gap: var(--space-1);
}

.sign-in-button,
.sign-up-button,
.sign-out-button,
.toggle-mode-button {
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
  color: hsl(0, 90%, 50%);
}

.button-link {
  display: inline-block;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 6px 0;
  border-radius: var(--radius-surface);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
@media (hover: hover) {
  .button-link:not(:disabled):hover {
    color: var(--color-primary);
  }
}
@media (hover: none) {
  .button-link:not(:disabled):active {
    color: var(--color-primary);
  }
}
</style>
