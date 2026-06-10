<script setup lang="ts">
import { ref } from "vue"

const isConfirmingAnonymousDataDeletion = ref(false)

function reset() {
  isConfirmingAnonymousDataDeletion.value = false
}

function showAnonymousDataDeletionConfirmation() {
  isConfirmingAnonymousDataDeletion.value = true
}

function hideAnonymousDataDeletionConfirmation() {
  isConfirmingAnonymousDataDeletion.value = false
}

function handleConfirmDeleteAnonymousData() {
  // 削除処理を呼び出す
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
      :disabled="isConfirmingAnonymousDataDeletion"
      @click="showAnonymousDataDeletionConfirmation"
    >
      この端末の匿名データを削除
    </button>
    <template v-if="isConfirmingAnonymousDataDeletion">
      <p class="confirm-message">
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
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-2);
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
