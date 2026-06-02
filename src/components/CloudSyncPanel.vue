<script setup lang="ts">
import { signInWithEmail, signOut, signUpWithEmail } from "@/lib/auth"
import type { Session } from "@supabase/supabase-js"
import { ref } from "vue"

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

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind | null>(null)
const isLoading = ref(false)

async function handleSignUp(): Promise<void> {
  if (isLoading.value) return
  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await signUpWithEmail(signUpEmail.value, signUpPassword.value)
    feedbackMessage.value = "アカウントを作成しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value =
      error instanceof Error ? error.message : "アカウントの作成に失敗しました"
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

async function handleSignIn(): Promise<void> {
  if (isLoading.value) return
  feedbackMessage.value = ""
  isLoading.value = true

  try {
    await signInWithEmail(signInEmail.value, signInPassword.value)
    feedbackMessage.value = "サインインしました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = error instanceof Error ? error.message : "サインインに失敗しました"
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
    feedbackMessage.value = error instanceof Error ? error.message : "サインアウトに失敗しました"
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
  feedbackMessage.value = ""
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
      <label class="account-label">
        <span class="account-label-text">メールアドレス</span>
        <input
          name="sign-in-email"
          type="email"
          class="account-input"
          v-model="signInEmail"
          placeholder="メールアドレスを入力"
        />
      </label>
      <label class="account-label">
        <span class="account-label-text">パスワード</span>
        <input
          name="sign-in-password"
          type="password"
          class="account-input"
          v-model="signInPassword"
          placeholder="パスワードを入力"
        />
      </label>
      <div class="account-actions">
        <button
          type="button"
          class="button-secondary sign-in-button"
          @click="handleSignIn"
          :disabled="isLoading"
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
      <label class="account-label">
        <span class="account-label-text">メールアドレス</span>
        <input
          name="sign-up-email"
          type="email"
          class="account-input"
          v-model="signUpEmail"
          placeholder="メールアドレスを入力"
        />
      </label>
      <label class="account-label">
        <span class="account-label-text">パスワード</span>
        <input
          name="sign-up-password"
          type="password"
          class="account-input"
          v-model="signUpPassword"
          placeholder="パスワードを入力"
        />
        <span class="password-rules">英大小文字、数字、記号を含む 8 文字以上</span>
      </label>
      <div class="account-actions">
        <button
          type="button"
          class="button-secondary sign-up-button"
          @click="handleSignUp"
          :disabled="isLoading"
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

.account-label {
  display: grid;
  gap: var(--space-1);
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

.password-rules {
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
