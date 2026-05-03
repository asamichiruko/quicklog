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
              name="showDailyCount"
              v-model="nextSettings.showDailyCount"
            />
            <span class="setting-label">日別の記録件数を表示</span>
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
  border-radius: 8px;
  padding: 16px;
}

h2 {
  margin: 0 0 32px;
  padding: 0;
}

ul {
  display: grid;
  gap: 16px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;
  padding: 8px 0;
  cursor: pointer;
}

.setting-label {
  font-size: 16px;
}

.setting-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #0d8df0;
}

menu {
  display: flex;
  gap: 16px;
  margin: 32px 0 0;
  padding: 0;
}
</style>
