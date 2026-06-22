<script setup lang="ts">
import { validateEmail } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [email: string]
  cancel: []
  edit: []
}>()

const passwordResetRequestEmail = ref("")
const passwordResetRequestEmailErrorMessage = ref("")

function validatePasswordResetRequestEmail() {
  passwordResetRequestEmailErrorMessage.value = validateEmail(passwordResetRequestEmail.value)
}

const canPasswordResetRequest = computed(() => {
  return (
    !props.isLoading &&
    !validateEmail(passwordResetRequestEmail.value) &&
    !passwordResetRequestEmailErrorMessage.value
  )
})

function handleSubmit() {
  if (!canPasswordResetRequest.value) return

  emit("submit", passwordResetRequestEmail.value)
}

function handleCancel() {
  reset()
  emit("cancel")
}

function reset() {
  passwordResetRequestEmailErrorMessage.value = ""
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h4 class="heading">パスワードリセット</h4>
    <div class="field">
      <label class="label">
        <span class="label-text">メールアドレス</span>
        <input
          v-model="passwordResetRequestEmail"
          type="email"
          name="password-reset-request-input"
          class="email-input"
          placeholder="メールアドレスを入力"
          aria-describedby="password-reset-request-email-error"
          :aria-invalid="Boolean(passwordResetRequestEmailErrorMessage)"
          @input="emit('edit')"
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
    <div class="actions">
      <button
        type="submit"
        class="button-secondary reset-password-button"
        :disabled="!canPasswordResetRequest"
      >
        パスワードリセット
      </button>
      <button
        type="button"
        class="button-link cancel-button"
        :disabled="props.isLoading"
        @click="handleCancel"
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

.email-input {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

.email-input::placeholder {
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
