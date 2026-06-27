<script setup lang="ts">
import { validateCreatedPassword, validateRequiredPassword } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [newPassword: string, currentPassword: string]
  cancel: []
  edit: []
}>()

const newPassword = ref("")
const currentPassword = ref("")

const newPasswordErrorMessage = ref("")
const currentPasswordErrorMessage = ref("")

const canChangePassword = computed(() => {
  return (
    !props.isLoading &&
    !validateCreatedPassword(newPassword.value) &&
    !validateRequiredPassword(currentPassword.value)
  )
})

function validateNewPassword() {
  newPasswordErrorMessage.value = validateCreatedPassword(newPassword.value)
}

function validateCurrentPassword() {
  currentPasswordErrorMessage.value = validateRequiredPassword(currentPassword.value)
}

function handleSubmit() {
  if (!canChangePassword.value) return

  emit("submit", newPassword.value, currentPassword.value)
}

function handleCancel() {
  reset()
  emit("cancel")
}

function reset() {
  newPassword.value = ""
  currentPassword.value = ""

  newPasswordErrorMessage.value = ""
  currentPasswordErrorMessage.value = ""
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h3 class="heading">パスワードの変更</h3>
    <div class="field">
      <label class="label">
        <span class="label-text">新しいパスワード</span>
        <input
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          name="new-password-input"
          class="password-input"
          placeholder="パスワードを入力"
          aria-describedby="new-password-error"
          :aria-invalid="Boolean(newPasswordErrorMessage)"
          @input="emit('edit')"
          @blur="validateNewPassword"
        />
      </label>
      <p class="password-rules">英大小文字、数字、記号を含む 8 文字以上</p>
      <p v-if="newPasswordErrorMessage" id="new-password-error" class="field-error">
        {{ newPasswordErrorMessage }}
      </p>
    </div>
    <div class="field">
      <label class="label">
        <span class="label-text">現在のパスワード</span>
        <input
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          name="current-password-input"
          class="password-input"
          placeholder="パスワードを入力"
          aria-describedby="current-password-error"
          :aria-invalid="Boolean(currentPasswordErrorMessage)"
          @input="emit('edit')"
          @blur="validateCurrentPassword"
        />
      </label>
      <p v-if="currentPasswordErrorMessage" id="current-password-error" class="field-error">
        {{ currentPasswordErrorMessage }}
      </p>
    </div>
    <div class="actions">
      <button
        type="submit"
        class="button-secondary reset-password-button"
        :disabled="!canChangePassword"
      >
        パスワードを変更
      </button>
      <button
        type="button"
        class="button-link cancel-button"
        :disabled="props.isLoading"
        @click="handleCancel"
      >
        戻る
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

.password-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

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

.actions {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

button {
  width: fit-content;
}
</style>
