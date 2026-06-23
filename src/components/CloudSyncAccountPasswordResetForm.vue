<script setup lang="ts">
import { validateCreatedPassword } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  submit: [password: string]
  cancel: []
  edit: []
}>()

const newPassword = ref("")
const newPasswordErrorMessage = ref("")

const canPasswordReset = computed(() => {
  return !props.isLoading && !validateCreatedPassword(newPassword.value)
})

function validateNewPassword() {
  newPasswordErrorMessage.value = validateCreatedPassword(newPassword.value)
}

function handleSubmit() {
  if (!canPasswordReset.value) return

  emit("submit", newPassword.value)
}

function handleCancel() {
  reset()
  emit("cancel")
}

function reset() {
  newPassword.value = ""
  newPasswordErrorMessage.value = ""
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h4 class="heading">新しいパスワードの設定</h4>
    <div class="field">
      <label class="label">
        <span class="label-text">新しいパスワード</span>
        <input
          v-model="newPassword"
          type="password"
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
    <div class="actions">
      <button
        type="submit"
        class="button-secondary reset-password-button"
        :disabled="!canPasswordReset"
      >
        パスワードを設定
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

.password-input {
  padding: var(--space-1) var(--space-2);
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
