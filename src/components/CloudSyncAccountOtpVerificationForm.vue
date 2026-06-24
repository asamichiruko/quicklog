<script setup lang="ts">
import { validateVerificationCode } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [verificationCode: string]
  resend: []
  cancel: []
  edit: []
}>()

const verificationCode = ref("")
const verificationCodeErrorMessage = ref("")

function validateEmailVerificationCode() {
  verificationCodeErrorMessage.value = validateVerificationCode(verificationCode.value)
}

const canVerifyEmail = computed(() => {
  return (
    !props.isLoading &&
    !validateVerificationCode(verificationCode.value) &&
    !verificationCodeErrorMessage.value
  )
})

function handleSubmit() {
  if (!canVerifyEmail.value) return

  emit("submit", verificationCode.value)
}

function reset() {
  verificationCode.value = ""
  verificationCodeErrorMessage.value = ""
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h4 class="heading">メールアドレスの確認</h4>
    <p class="email-verify-description">送信された確認コードを入力してください</p>
    <div class="field">
      <label class="label">
        <span class="label-text">確認コード</span>
        <input
          v-model="verificationCode"
          type="text"
          autocomplete="one-time-code"
          maxlength="6"
          name="verification-code"
          class="verification-code-input"
          placeholder="確認コードを入力"
          aria-describedby="verification-code-error"
          :aria-invalid="Boolean(verificationCodeErrorMessage)"
          @input="emit('edit')"
          @blur="validateEmailVerificationCode"
        />
      </label>
      <p v-if="verificationCodeErrorMessage" id="verification-code-error" class="field-error">
        {{ verificationCodeErrorMessage }}
      </p>
    </div>
    <div class="actions">
      <button
        type="submit"
        class="button-secondary verify-email-button"
        :disabled="!canVerifyEmail"
      >
        認証する
      </button>

      <button
        type="button"
        class="button-link change-mode-button"
        :disabled="props.isLoading"
        @click="emit('resend')"
      >
        確認メールを再送する
      </button>
      <button
        type="button"
        class="button-link cancel-reset-password-button"
        :disabled="props.isLoading"
        @click="emit('cancel')"
      >
        認証をキャンセル
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
  font-size: var(--font-size-medium);
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

.verification-code-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

.verification-code-input::placeholder {
  color: var(--color-text-subtle);
}

.email-verify-description {
  margin: 0;
  padding: 0;
  font-size: var(--font-size-small);
}

.field-error {
  margin: 0;
  padding: 0;
  color: var(--color-text-error);
}

.actions {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

button {
  width: fit-content;
}
</style>
