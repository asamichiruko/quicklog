<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean
  currentEmail: string
  newEmail: string
}>()

const emit = defineEmits<{
  revise: [newEmail: string]
  back: []
  resend: []
}>()

function handleReviseNewEmail() {
  emit("revise", props.newEmail)
}
</script>

<template>
  <div class="container">
    <h3 class="heading">確認メールを送信しました</h3>
    <div class="label">
      <span class="label-text">現在のメールアドレス</span>
      <p class="text-content">{{ props.currentEmail }}</p>
    </div>
    <div class="label">
      <span class="label-text">新しいメールアドレス</span>
      <p class="text-content">{{ props.newEmail }}</p>
    </div>
    <div>
      <p>
        上記のメールアドレスが正しいことを確認し、それぞれに届いた確認メールのリンクを開いてください。
      </p>
      <p>両方のメールアドレスで確認が完了すると、メールアドレスが変更されます。</p>
      <p>確認が完了するまでは現在のメールアドレスが有効のままになります。</p>
    </div>
    <form class="actions">
      <button
        type="button"
        class="button-primary"
        :disabled="props.isLoading"
        @click="emit('resend')"
      >
        確認メールを再送
      </button>
      <button
        type="button"
        class="button-link"
        :disabled="props.isLoading"
        @click="handleReviseNewEmail"
      >
        新しいメールアドレスを修正
      </button>
      <button type="button" class="button-link" :disabled="props.isLoading" @click="emit('back')">
        アカウント画面に戻る
      </button>
    </form>
    <div>
      <p>この画面を離れても、送信した確認メールのリンクは無効になりません。</p>
      <p>もし変更を希望しない場合は、確認メールのリンクを開かないでください。</p>
    </div>
  </div>
</template>

<style lang="css" scoped>
.actions {
  display: grid;
  gap: var(--space-2);
}

button {
  width: fit-content;
}

.heading {
  font-size: 1.2em;
  padding: 0;
  margin: 0;
}

.label {
  display: grid;
  gap: var(--space-1);
}

.label-text {
  font-weight: var(--font-weight-bold);
}

p {
  margin: 0;
}

.text-content {
  padding: var(--space-2) var(--space-3);
  margin: 0;
}
</style>
