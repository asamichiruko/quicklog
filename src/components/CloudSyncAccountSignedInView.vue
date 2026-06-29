<script setup lang="ts">
import type { SignedInPanelView } from "@/components/CloudSyncAccountPanel.vue"

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  sync: []
  signOut: []
  deleteCloudSync: []
  changeView: [view: SignedInPanelView]
}>()

function handleDeleteCloudSync() {
  const result = confirm(
    "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
  )
  if (!result) return

  emit("deleteCloudSync")
}

function reset() {}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <h3 class="heading">クラウド同期</h3>
    <button
      type="button"
      class="button-primary sync-button"
      :disabled="props.isLoading"
      @click="emit('sync')"
    >
      いますぐ同期
    </button>
    <h3 class="heading">アカウント</h3>
    <button
      type="button"
      class="button-menu change-view-button"
      :disabled="props.isLoading"
      @click="emit('changeView', 'changePassword')"
    >
      <span class="list-item-button-label">パスワードを変更</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
        />
      </svg>
    </button>
    <button
      type="button"
      class="button-secondary sign-out-button"
      :disabled="props.isLoading"
      @click="emit('signOut')"
    >
      サインアウト
    </button>
    <h3 class="heading">危険な操作</h3>
    <details class="delete-cloud-sync-confirmation">
      <summary>クラウド同期アカウントとデータを削除</summary>
      <div class="delete-cloud-sync-body">
        <p class="delete-cloud-sync-description">
          現在サインインしているクラウド同期アカウントと、クラウド上の同期データを削除します。この端末に保存されている記録は、サインインしていない状態のデータとして残ります。
        </p>
        <div class="confirm-actions">
          <button
            type="button"
            class="button-danger delete-cloud-sync-button"
            :disabled="props.isLoading"
            @click="handleDeleteCloudSync"
          >
            削除する
          </button>
        </div>
      </div>
    </details>
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

.change-view-button {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
  border-radius: var(--radius-surface);
}

.change-view-button svg {
  margin-inline-start: auto;
}

.delete-cloud-sync-confirmation {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  padding: var(--space-3);
}

.delete-cloud-sync-body {
  margin-top: var(--space-3);
  display: grid;
  gap: var(--space-3);
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
