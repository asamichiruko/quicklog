<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"

const emit = defineEmits<{
  click: []
}>()

const visible = ref(false)

const showScrollY = 320
const hideScrollY = 120

function updateVisibility() {
  const scrollY = window.scrollY

  if (visible.value) {
    visible.value = scrollY > hideScrollY
    return
  }

  visible.value = scrollY > showScrollY
}

onMounted(() => {
  updateVisibility()
  window.addEventListener("scroll", updateVisibility, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener("scroll", updateVisibility)
})
</script>

<template>
  <button
    v-if="visible"
    class="button-primary new-log-entry-button"
    type="button"
    @click="emit('click')"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-pencil"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"
      />
    </svg>
    <span>メモを書く</span>
  </button>
</template>

<style lang="css" scoped>
.new-log-entry-button {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transform: translateX(-50%);
}
</style>
