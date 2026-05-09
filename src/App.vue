<script setup lang="ts">
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import { loadLogEntries, loadSettings, saveLogEntries, saveSettings } from "@/lib/storage"
import { type AppSettings, type LogEntry } from "@/types"
import { onMounted, ref } from "vue"

const items = ref<LogEntry[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)

function openSettings() {
  settingsDialog.value?.open()
}

onMounted(() => {
  items.value = loadLogEntries()
  settings.value = loadSettings()
})

function handleSubmit(text: string) {
  const item: LogEntry = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  }

  items.value.unshift(item)
  saveLogEntries(items.value)
}

function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  items.value = items.value.filter((item) => item.id !== id)
  saveLogEntries(items.value)
}

function handleExport() {
  const json = JSON.stringify(items.value, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  const date = new Date().toISOString().split("T")[0]
  a.href = url
  a.download = `quicklog-${date}.json`
  a.click()

  URL.revokeObjectURL(url)
}

function handleSaveSettings(nextSettings: AppSettings) {
  settings.value = nextSettings
  saveSettings(nextSettings)
}
</script>

<template>
  <main class="app">
    <header class="header">
      <h1 class="title">quicklog</h1>
      <p class="header-actions">
        <button class="settings-button" type="button" aria-label="設定" @click="openSettings()">
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
      </p>
    </header>

    <LogEntryForm @submit="handleSubmit" />
    <LogEntryList
      :items="items"
      :show-time-strip="settings.showTimeStrip"
      @remove="handleRemove"
      @export="handleExport"
    />
    <SettingsDialog ref="settingsDialog" :settings="settings" @save="handleSaveSettings" />
  </main>
</template>

<style lang="css" scoped>
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-2);
}

.header {
  position: relative;
  margin-bottom: var(--space-3);
  padding-right: 40px;
}

.title {
  font-size: 2em;
  font-weight: var(--font-weight-bold);
  margin: 0;
}

.header-actions {
  position: absolute;
  top: 0;
  right: 0;
  margin: 0;
}

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
  background: var(--color-control-hover);
}
</style>
