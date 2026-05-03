<script setup lang="ts">
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)

function open() {
  if (!dialog.value || dialog.value.open) return
  dialog.value?.showModal()
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
            <input type="checkbox" name="dailyCount" />
            日別の記録件数を表示
          </label>
        </li>
      </ul>

      <menu>
        <button type="button" @click="close()">閉じる</button>
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
  margin: 24px 0 0;
  padding: 0;
}
</style>
