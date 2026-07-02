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
const isConfirmingAnonymousDataDeletion = ref(false)
const isLoading = ref(false)

const canShowAnonymousDataDeletionConfirmation = computed(() => {
  return (
    !isConfirmingAnonymousDataDeletion.value &&
    (props.anonymousDataState.logEntryCount > 0 ||
      props.anonymousDataState.logEntryDeletionCount > 0)
  )
})

function reset() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = false
  isConfirmingAnonymousDataDeletion.value = false
}

function showAnonymousDataDeletionConfirmation() {
  if (canShowAnonymousDataDeletionConfirmation.value) {
    isConfirmingAnonymousDataDeletion.value = true
  }
}

function hideAnonymousDataDeletionConfirmation() {
  isConfirmingAnonymousDataDeletion.value = false
}

function handleConfirmDeleteAnonymousData() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = true

  try {
    props.deleteAnonymousData()

    feedbackMessage.value = "この端末の匿名データを削除しました"
    feedbackKind.value = "success"
    isConfirmingAnonymousDataDeletion.value = false
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
    <p class="delete-anonymous-data-description">
      サインインしていない状態でこの端末に記録したメモを削除します。サインイン中のユーザデータやクラウド上のデータは削除されません。
    </p>
    <button
      type="button"
      class="button-secondary show-button"
      :disabled="!canShowAnonymousDataDeletionConfirmation"
      @click="showAnonymousDataDeletionConfirmation"
    >
      この端末の匿名データを削除
    </button>
    <template v-if="isConfirmingAnonymousDataDeletion">
      <p class="confirm-message">
        {{ props.anonymousDataState.logEntryCount }} 件の記録と
        {{ props.anonymousDataState.logEntryDeletionCount }} 件の削除記録を含む、
        この端末の匿名データを削除します。この操作は元に戻せません。本当に削除しますか？
      </p>
      <div class="confirm-actions">
        <button
          type="button"
          class="button-secondary hide-button"
          @click="hideAnonymousDataDeletionConfirmation"
        >
          キャンセル
        </button>
        <button
          :disabled="isLoading"
          type="button"
          class="button-danger delete-button"
          @click="handleConfirmDeleteAnonymousData"
        >
          削除する
        </button>
      </div>
    </template>
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

.show-button,
.hide-button,
.delete-button {
  width: fit-content;
}
</style>
