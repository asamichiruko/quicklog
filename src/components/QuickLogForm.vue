<script setup lang="ts">
import { ref } from "vue"

const text = ref("")

const emit = defineEmits<{
  submit: [text: string]
}>()

function onSubmit() {
  const value = text.value.trim()
  if (!value) return

  emit("submit", value)
  text.value = ""
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <label>
      <span class="label">メモ</span>
      <textarea
        v-model="text"
        class="textarea"
        rows="3"
        placeholder="いま記録したいことは？"
      ></textarea>
    </label>
    <button class="button-primary submit-button" type="submit">保存</button>
  </form>
</template>

<style lang="css" scoped>
.form {
  display: grid;
  gap: 16px;
}

.label {
  font-weight: 500;
}

.textarea {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  line-height: 1.5;
  padding: 16px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  background: #ffffff;
  color: #222222;
}

.textarea::placeholder {
  color: #999999;
}

.submit-button {
  width: fit-content;
  justify-self: end;
}
</style>
