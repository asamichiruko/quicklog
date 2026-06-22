<script setup lang="ts">
import type { SelectablePanelView } from "@/components/CloudSyncAccountPanel.vue"
import { validateEmail, validateRequiredPassword } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [email: string, password: string]
  changeView: [view: SelectablePanelView]
  edit: []
}>()

const signInEmail = ref("")
const signInPassword = ref("")

const signInEmailErrorMessage = ref("")
const signInPasswordErrorMessage = ref("")

const canSignIn = computed(() => {
  return (
    !props.isLoading &&
    !validateEmail(signInEmail.value) &&
    !validateRequiredPassword(signInPassword.value) &&
    !signInEmailErrorMessage.value &&
    !signInPasswordErrorMessage.value
  )
})

function validateSignInEmail() {
  signInEmailErrorMessage.value = validateEmail(signInEmail.value)
}

function validateSignInPassword() {
  signInPasswordErrorMessage.value = validateRequiredPassword(signInPassword.value)
}

function handleSubmit() {
  emit("submit", signInEmail.value, signInPassword.value)
}

function showSignUpView() {
  resetAuthFormState()
  emit("changeView", "signUp")
}

function showResetPasswordView() {
  resetAuthFormState()
  emit("changeView", "resetPassword")
}

function resetAuthFormState() {
  signInEmail.value = ""
  signInPassword.value = ""

  signInEmailErrorMessage.value = ""
  signInPasswordErrorMessage.value = ""
}

function reset() {
  resetAuthFormState()
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h4 class="heading">サインイン</h4>
    <div class="field">
      <label class="label">
        <span class="label-text">メールアドレス</span>
        <input
          v-model="signInEmail"
          name="sign-in-email"
          type="email"
          class="email-input"
          placeholder="メールアドレスを入力"
          aria-describedby="sign-in-email-error"
          :aria-invalid="Boolean(signInEmailErrorMessage)"
          @input="emit('edit')"
          @blur="validateSignInEmail"
        />
      </label>
      <p v-if="signInEmailErrorMessage" id="sign-in-email-error" class="field-error">
        {{ signInEmailErrorMessage }}
      </p>
    </div>
    <div class="field">
      <label class="label">
        <span class="label-text">パスワード</span>
        <input
          v-model="signInPassword"
          name="sign-in-password"
          type="password"
          class="password-input"
          placeholder="パスワードを入力"
          aria-describedby="sign-in-password-error"
          :aria-invalid="Boolean(signInPasswordErrorMessage)"
          @input="emit('edit')"
          @blur="validateSignInPassword"
        />
      </label>
      <p v-if="signInPasswordErrorMessage" id="sign-in-password-error" class="field-error">
        {{ signInPasswordErrorMessage }}
      </p>
    </div>
    <div class="actions">
      <button type="submit" class="button-secondary sign-in-button" :disabled="!canSignIn">
        サインイン
      </button>
      <button
        type="button"
        class="button-link change-view-button"
        :disabled="isLoading"
        @click="showSignUpView"
      >
        アカウントを作成する
      </button>
      <button
        type="button"
        class="button-link change-view-button"
        :disabled="isLoading"
        @click="showResetPasswordView"
      >
        パスワードを忘れた場合
      </button>
    </div>
  </form>
</template>

<style lang="css" scoped>
.form {
  display: grid;
  gap: var(--space-2);
}

.heading {
  font-size: var(--font-size-medium);
  padding: 0;
  margin: 0;
}

.field {
  display: grid;
  gap: 4px;
}

.label {
  display: grid;
  gap: 4px;
}

.label-text {
  font-weight: var(--font-weight-bold);
}

.email-input,
.password-input {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

.email-input::placeholder,
.password-input::placeholder {
  color: var(--color-text-subtle);
}

.field-error {
  margin: 0;
  padding: 0;
  color: var(--color-error);
}

.actions {
  display: grid;
  justify-items: start;
  gap: var(--space-1);
}

button {
  width: fit-content;
}
</style>
