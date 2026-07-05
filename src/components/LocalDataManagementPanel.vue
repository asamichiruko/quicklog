<script setup lang="ts">
import type { AnonymousDataState } from "@/types"
import { computed, ref } from "vue"
const props = defineProps<{
  anonymousDataState: AnonymousDataState
  deleteAnonymousData: () => void
}>()

type FeedbackKind = "success" | "error" | null

const feedbackMessage = ref("")
const feedbackKind = ref<FeedbackKind>(null)
const isLoading = ref(false)

const deleteAnonymousDataConfirmation = ref<HTMLDetailsElement | null>(null)
const canShowAnonymousDataDeletionConfirmation = computed(() => {
  return (
    props.anonymousDataState.logEntryCount > 0 || props.anonymousDataState.logEntryDeletionCount > 0
  )
})

function reset() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = false
  hideAnonymousDataDeletionConfirmation()
}

function hideAnonymousDataDeletionConfirmation() {
  if (deleteAnonymousDataConfirmation.value) {
    deleteAnonymousDataConfirmation.value.open = false
  }
}

function handleConfirmDeleteAnonymousData() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = true

  try {
    props.deleteAnonymousData()

    feedbackMessage.value = "この端末の匿名データを削除しました"
    feedbackKind.value = "success"
    hideAnonymousDataDeletionConfirmation()
  } catch (error) {
    feedbackMessage.value = "匿名データの削除に失敗しました"
    console.warn(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <details ref="deleteAnonymousDataConfirmation" class="delete-anonymous-data-confirmation">
      <summary>この端末の匿名データを削除</summary>
      <div class="delete-anonymous-data-body">
        <p class="delete-anonymous-data-description">
          サインインしていない状態でこの端末に記録したメモを削除します。サインイン中のユーザデータやクラウド上のデータは削除されません。
        </p>
        <template v-if="canShowAnonymousDataDeletionConfirmation">
          <p class="confirm-message danger">
            {{ props.anonymousDataState.logEntryCount }} 件の記録と
            {{ props.anonymousDataState.logEntryDeletionCount }} 件の削除記録を含む、
            この端末の匿名データを削除します。この操作は元に戻せません。本当に削除しますか？
          </p>
          <div class="confirm-actions">
            <button
              :disabled="isLoading || !canShowAnonymousDataDeletionConfirmation"
              type="button"
              class="button-secondary hide-button"
              @click="hideAnonymousDataDeletionConfirmation"
            >
              キャンセル
            </button>
            <button
              :disabled="isLoading || !canShowAnonymousDataDeletionConfirmation"
              type="button"
              class="button-danger delete-button"
              @click="handleConfirmDeleteAnonymousData"
            >
              削除する
            </button>
          </div>
        </template>
        <template v-else>
          <p class="empty-anonymous-data-message">
            匿名データが存在しないため、削除操作は行えません。
          </p>
        </template>
      </div>
    </details>
    <p v-if="feedbackMessage" class="feedback" :class="feedbackKind">
      {{ feedbackMessage }}
    </p>
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-3);
}

.delete-anonymous-data-confirmation {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  padding: var(--space-3);
}

.delete-anonymous-data-body {
  margin-top: var(--space-3);
  display: grid;
  gap: var(--space-3);
}

.feedback {
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-surface);
  background: var(--color-output);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.feedback.error {
  color: var(--color-text-error);
}

.delete-anonymous-data-description {
  margin: 0;
}

.confirm-message {
  margin: 0;
  color: var(--color-text-error);
}

.confirm-actions {
  display: flex;
  gap: var(--space-3);
}

.empty-anonymous-data-message {
  color: var(--color-text-muted);
  margin: 0;
}

.show-button,
.hide-button,
.delete-button {
  width: fit-content;
}
</style>
