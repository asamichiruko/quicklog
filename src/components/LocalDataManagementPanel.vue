<script setup lang="ts">
import type { AnonymousDataState } from "@/types"
import { computed, ref } from "vue"
const props = defineProps<{
  anonymousDataState: AnonymousDataState
  deleteAnonymousData: () => void
}>()

const feedbackMessage = ref("")
const isConfirmingAnonymousDataDeletion = ref(false)

const canShowAnonymousDataDeletionConfirmation = computed(() => {
  return (
    !isConfirmingAnonymousDataDeletion.value &&
    (props.anonymousDataState.logEntryCount > 0 ||
      props.anonymousDataState.logEntryDeletionCount > 0)
  )
})

function reset() {
  feedbackMessage.value = ""
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
  props.deleteAnonymousData()
  feedbackMessage.value = "この端末の匿名データを削除しました"
  isConfirmingAnonymousDataDeletion.value = false
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
        <template v-if="props.anonymousDataState.logEntryCount > 0">
          {{ props.anonymousDataState.logEntryCount }} 件の記録を含む、
        </template>
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
          type="button"
          class="button-danger delete-button"
          @click="handleConfirmDeleteAnonymousData"
        >
          削除する
        </button>
      </div>
    </template>
    <p v-if="feedbackMessage" class="feedback-message">
      {{ feedbackMessage }}
    </p>
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-2);
}

.feedback-message {
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-surface);
  background: var(--color-page);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.delete-anonymous-data-description {
  margin: 0;
  font-size: var(--font-size-small);
}

.confirm-message {
  margin: 0;
  color: var(--color-error);
}

.confirm-actions {
  display: flex;
  gap: var(--space-2);
}

.show-button,
.hide-button,
.delete-button {
  width: fit-content;
}
</style>
