<script setup lang="ts">
const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button class="settings-button" type="button" aria-label="設定" @click="emit('click')">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="73.5 73.5 152.5 152.5">
      <g transform="translate(150 150)">
        <g transform="rotate(0)">
          <path
            d="M -14.51 -52.33 L -10.66 -70.82 Q -10 -74 -6.75 -74 L 6.75 -74 Q 10 -74 10.66 -70.82 L 14.51 -52.33 Q 15 -50 17.26 -49.26 A 52.2 52.2 0 0 1 22.63 -47.04 Q 24.75 -45.96 26.74 -47.27 L 42.53 -57.61 Q 45.25 -59.4 47.55 -57.1 L 57.1 -47.55 Q 59.4 -45.25 57.61 -42.53 L 47.27 -26.74 Q 45.96 -24.75 47.04 -22.63 A 52.2 52.2 0 0 1 49.26 -17.26 Q 50 -15 52.33 -14.51 L 70.82 -10.66 Q 74 -10 74 -6.75 L 74 6.75 Q 74 10 70.82 10.66 L 52.33 14.51 Q 50 15 49.26 17.26 A 52.2 52.2 0 0 1 47.04 22.63 Q 45.96 24.75 47.27 26.74 L 57.61 42.53 Q 59.4 45.25 57.1 47.55 L 47.55 57.1 Q 45.25 59.4 42.53 57.61 L 26.74 47.27 Q 24.75 45.96 22.63 47.04 A 52.2 52.2 0 0 1 17.26 49.26 Q 15 50 14.51 52.33 L 10.66 70.82 Q 10 74 6.75 74 L -6.75 74 Q -10 74 -10.66 70.82 L -14.51 52.33 Q -15 50 -17.26 49.26 A 52.2 52.2 0 0 1 -22.63 47.04 Q -24.75 45.96 -26.74 47.27 L -42.53 57.61 Q -45.25 59.4 -47.55 57.1 L -57.1 47.55 Q -59.4 45.25 -57.61 42.53 L -47.27 26.74 Q -45.96 24.75 -47.04 22.63 A 52.2 52.2 0 0 1 -49.26 17.26 Q -50 15 -52.33 14.51 L -70.82 10.66 Q -74 10 -74 6.75 L -74 -6.75 Q -74 -10 -70.82 -10.66 L -52.33 -14.51 Q -50 -15 -49.26 -17.26 A 52.2 52.2 0 0 1 -47.04 -22.63 Q -45.96 -24.75 -47.27 -26.74 L -57.61 -42.53 Q -59.4 -45.25 -57.1 -47.55 L -47.55 -57.1 Q -45.25 -59.4 -42.53 -57.61 L -26.74 -47.27 Q -24.75 -45.96 -22.63 -47.04 A 52.2 52.2 0 0 1 -17.26 -49.26 Q -15 -50 -14.51 -52.33 Z"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          <circle r="25" fill="none" stroke="currentColor" stroke-width="4"></circle>
        </g>
      </g>
    </svg>
  </button>
</template>

<style lang="css" scoped>
.settings-button {
  display: inline-grid;
  place-items: center;
  inline-size: var(--control-min-size);
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  color: var(--color-text);
  padding: 8px;
  cursor: pointer;
  opacity: 0.8;
}
.settings-button:hover,
.settings-button:focus {
  opacity: 1;
  background: #eeeeee;
}
</style>
