<script setup lang="ts">
import { validateEmail } from "@/lib/authFormValidation"
import { computed, ref } from "vue"

const props = defineProps<{
  isLoading: boolean
  currentEmail: string
  defaultNewEmail?: string
}>()

const emit = defineEmits<{
  submit: [newEmail: string]
  edit: []
}>()

const newEmail = ref(props.defaultNewEmail ?? "")
const newEmailErrorMessage = ref("")

const canChangeEmail = computed(() => {
  return !props.isLoading && !validateEmail(newEmail.value)
})

function validateNewEmail() {
  newEmailErrorMessage.value = validateEmail(newEmail.value)
}

function handleSubmit() {
  if (!canChangeEmail.value) return

  emit("submit", newEmail.value)
}

function reset() {
  newEmail.value = ""
  newEmailErrorMessage.value = ""
}

defineExpose({ reset })
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <h3 class="heading">メールアドレスの変更</h3>
    <div class="field">
      <div class="label">
        <span class="label-text">現在のメールアドレス</span>
        <p class="text-content">{{ currentEmail }}</p>
      </div>
    </div>
    <div class="field">
      <label class="label">
        <span class="label-text">新しいメールアドレス</span>
        <input
          v-model="newEmail"
          type="email"
          name="new-email-input"
          class="email-input"
          placeholder="新しいメールアドレスを入力"
          aria-describedby="new-email-error"
          :aria-invalid="Boolean(newEmailErrorMessage)"
          @input="emit('edit')"
          @blur="validateNewEmail"
        />
      </label>
      <p v-if="newEmailErrorMessage" id="new-email-error" class="field-error">
        {{ newEmailErrorMessage }}
      </p>
    </div>
    <p class="description">
      メールアドレス変更のため、現在のメールアドレスと新しいメールアドレスの両方に確認メールを送信します。送信後、各メールに記載されたリンクを開いてください。
    </p>
    <div class="actions">
      <button type="submit" class="button-primary change-email-button" :disabled="!canChangeEmail">
        確認メールを送信
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

.text-content {
  padding: var(--space-2) var(--space-3);
  margin: 0;
}

.email-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

.email-input::placeholder {
  color: var(--color-text-subtle);
}

.field-error {
  margin: 0;
  padding: 0;
  color: var(--color-text-error);
}

.description {
  margin: 0;
}

button {
  width: fit-content;
}
</style>
