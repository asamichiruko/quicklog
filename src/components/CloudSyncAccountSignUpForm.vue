<script setup lang="ts">
import type { SelectablePanelView } from "@/components/CloudSyncAccountPanel.vue"
import { validateCreatedPassword, validateEmail } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [email: string, password: string]
  changeView: [view: SelectablePanelView]
  edit: []
}>()

const signUpEmail = ref("")
const signUpPassword = ref("")

const signUpEmailErrorMessage = ref("")
const signUpPasswordErrorMessage = ref("")

const canSignUp = computed(() => {
  return (
    !props.isLoading &&
    !validateEmail(signUpEmail.value) &&
    !validateCreatedPassword(signUpPassword.value) &&
    !signUpEmailErrorMessage.value &&
    !signUpPasswordErrorMessage.value
  )
})

function handleSubmit() {
  emit("submit", signUpEmail.value, signUpPassword.value)
}

function showSignInView() {
  emit("changeView", "signIn")
}

function validateSignUpEmail() {
  signUpEmailErrorMessage.value = validateEmail(signUpEmail.value)
}

function validateSignUpPassword() {
  signUpPasswordErrorMessage.value = validateCreatedPassword(signUpPassword.value)
}

function resetAuthFormState() {}

function reset() {
  resetAuthFormState()
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h4 class="heading">アカウント作成</h4>
    <div class="field">
      <label class="label">
        <span class="label-text">メールアドレス</span>
        <input
          v-model="signUpEmail"
          name="sign-up-email"
          type="email"
          class="email-input"
          placeholder="メールアドレスを入力"
          aria-describedby="sign-up-email-error"
          :aria-invalid="Boolean(signUpEmailErrorMessage)"
          @input="emit('edit')"
          @blur="validateSignUpEmail"
        />
      </label>
      <p v-if="signUpEmailErrorMessage" id="sign-up-email-error" class="field-error">
        {{ signUpEmailErrorMessage }}
      </p>
    </div>
    <div class="field">
      <label class="label">
        <span class="label-text">パスワード</span>
        <input
          v-model="signUpPassword"
          name="sign-up-password"
          type="password"
          class="password-input"
          placeholder="パスワードを入力"
          aria-describedby="sign-up-password-error"
          :aria-invalid="Boolean(signUpPasswordErrorMessage)"
          @input="emit('edit')"
          @blur="validateSignUpPassword"
        />
      </label>
      <p class="password-rules">英大小文字、数字、記号を含む 8 文字以上</p>
      <p v-if="signUpPasswordErrorMessage" id="sign-up-password-error" class="field-error">
        {{ signUpPasswordErrorMessage }}
      </p>
    </div>
    <div class="actions">
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

.password-rules {
  margin: 0;
  padding: 0;
  font-size: var(--font-size-small);
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
