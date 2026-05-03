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
          <label>
            <input type="checkbox" name="showDailyCount" v-model="nextSettings.showDailyCount" />
            日別の記録件数を表示
          </label>
        </li>
      </ul>

      <menu>
        <button type="button" @click="saveAndClose">設定を保存</button>
        <button type="button" @click="close">キャンセル</button>
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
  margin: 0 0 24px;
  padding: 0;
}

ul {
  display: grid;
  gap: 16px;
  padding: 0;
  margin: 0;
  list-style: none;
}

menu {
  display: flex;
  gap: 16px;
  margin: 24px 0 0;
  padding: 0;
}
</style>
