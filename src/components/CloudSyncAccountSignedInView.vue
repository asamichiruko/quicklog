<script setup lang="ts">
import type { SignedInPanelView } from "@/components/CloudSyncAccountPanel.vue"
import { ref } from "vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  sync: []
  signOut: []
  deleteCloudSync: []
  changeView: [view: SignedInPanelView]
}>()

const isConfirmingCloudSyncDeletion = ref(false)

function toggleCloudSyncDeletionConfirmation() {
  isConfirmingCloudSyncDeletion.value = !isConfirmingCloudSyncDeletion.value
}

function hideCloudSyncDeletionConfirmation() {
  isConfirmingCloudSyncDeletion.value = false
}

function reset() {
  isConfirmingCloudSyncDeletion.value = false
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <h3 class="heading">クラウド同期</h3>
    <button
      type="button"
      class="button-secondary sync-button"
      :disabled="props.isLoading"
      @click="emit('sync')"
    >
      同期
    </button>
    <button
      type="button"
      class="button-secondary sign-out-button"
      :disabled="props.isLoading"
      @click="emit('signOut')"
    >
      サインアウト
    </button>
    <button
      type="button"
      class="button-link change-view-button"
      :disabled="props.isLoading"
      @click="emit('changeView', 'changePassword')"
    >
      パスワードを変更
    </button>
    <button
      type="button"
      class="button-link toggle-delete-cloud-data-button"
      :disabled="props.isLoading"
      @click="toggleCloudSyncDeletionConfirmation"
    >
      クラウド同期アカウントとデータを削除
    </button>
    <template v-if="isConfirmingCloudSyncDeletion">
      <p class="delete-cloud-sync-description">
        現在サインインしているクラウド同期アカウントと、クラウド上の同期データを削除します。この端末に保存されている記録は、サインインしていない状態のデータとして残ります。
      </p>
      <p class="confirm-message">
        クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？
      </p>
      <div class="confirm-actions">
        <button
          type="button"
          class="button-secondary hide-delete-cloud-sync-button"
          :disabled="props.isLoading"
          @click="hideCloudSyncDeletionConfirmation"
        >
          キャンセル
        </button>
        <button
          type="button"
          class="button-danger delete-cloud-sync-button"
          :disabled="props.isLoading"
          @click="emit('deleteCloudSync')"
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
  gap: var(--space-3);
}

.heading {
  font-size: 1.2em;
  padding: 0;
  margin: 0;
}

button {
  width: fit-content;
}

.delete-cloud-sync-description {
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
</style>
