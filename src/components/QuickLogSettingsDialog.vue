<script setup lang="ts">
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { QuickLogSettings } from "@/types"
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const nextSettings = ref<QuickLogSettings>({ ...DEFAULT_SETTINGS })

const props = defineProps<{
  settings: QuickLogSettings
}>()

const emit = defineEmits<{
  save: [nextSettings: QuickLogSettings]
}>()

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }

  dialog.value?.showModal()
}

function saveAndClose() {
  emit("save", { ...nextSettings.value })
  close()
}

function close() {
  dialog.value?.close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog">
    <h2>設定</h2>
    <form method="dialog">
      <ul>
        <li>
          <label class="setting-row">
            <input
              class="setting-checkbox"
              type="checkbox"
              name="showTimeStrip"
              v-model="nextSettings.showTimeStrip"
            />
            <span class="setting-label">記録時刻の分布グラフを表示</span>
          </label>
        </li>
      </ul>

      <menu>
        <button class="button-primary" type="button" @click="saveAndClose">設定を保存</button>
        <button class="button-secondary" type="button" @click="close">キャンセル</button>
      </menu>
    </form>
  </dialog>
</template>

<style lang="css" scoped>
dialog {
  width: min(90vw, 400px);
  border: none;
  border-radius: var(--radius-surface);
  padding: var(--space-2);
}

h2 {
  margin: 0 0 var(--space-4);
  padding: 0;
}

ul {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: var(--space-1) 0;
  cursor: pointer;
}

.setting-label {
  font-size: var(--font-size-md);
}

.setting-checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
}

menu {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
  padding: 0;
}
</style>
