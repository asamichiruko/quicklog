<script setup lang="ts">
import { validateCreatedPassword, validateEmail } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [email: string, password: string]
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
  if (!canSignUp.value) return

  emit("submit", signUpEmail.value, signUpPassword.value)
}

function validateSignUpEmail() {
  signUpEmailErrorMessage.value = validateEmail(signUpEmail.value)
}

function validateSignUpPassword() {
  signUpPasswordErrorMessage.value = validateCreatedPassword(signUpPassword.value)
}
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h3 class="heading">アカウント作成</h3>
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
          autocomplete="new-password"
          class="password-input"
          placeholder="新しいパスワードを入力"
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
      <button type="submit" class="button-primary sign-up-button" :disabled="!canSignUp">
        アカウントを作成
      </button>
    </div>
  </form>
</template>

<style lang="css" scoped>
.form {
  display: grid;
  gap: var(--space-3);
}

.heading {
  font-size: 1.2em;
  padding: 0;
  margin: 0;
}

.field {
  display: grid;
  gap: var(--space-1);
}

.label {
  display: grid;
  gap: var(--space-1);
}

.label-text {
  font-weight: var(--font-weight-bold);
}

.email-input,
.password-input {
  padding: var(--space-2) var(--space-3);
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
  color: var(--color-text-error);
}

button {
  width: fit-content;
}
</style>
