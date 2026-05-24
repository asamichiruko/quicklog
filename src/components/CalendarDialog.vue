<script setup lang="ts">
import { getLocalDateKey } from "@/lib/date"
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)

const props = defineProps<{
  initialDate: Date
}>()

const emit = defineEmits<{
  select: [selectedDate: Date]
}>()

function open() {
  if (!dialog.value || dialog.value.open) return

  dialog.value?.showModal()
}

function selectAndClose() {
  // カレンダーで選ばれた日付を返す
  emit("select", new Date(2026, 0, 1))
  close()
}

function close() {
  dialog.value?.close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog">
    <div>
      <h2>表示する日付を選択</h2>
      <!-- 仮の内容、これから内容を作る -->
      <p>初期値: {{ getLocalDateKey(props.initialDate) }}</p>
      <div>
        <button class="button-secondary" type="button" @click="selectAndClose">
          特定の日付を返す
        </button>
        <button class="button-secondary" type="button" @click="close">キャンセル</button>
      </div>
    </div>
  </dialog>
</template>

<style lang="css" scoped>
.dialog {
  width: min(90vw, 480px);
  border: none;
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  padding: var(--space-2);
}

.dialog-heading {
  margin: 0;
  padding: 0;
  color: var(--color-text);
  font-size: 1.5em;
  font-weight: var(--font-weight-bold);
}
</style>
