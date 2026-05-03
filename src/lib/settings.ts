import type { QuickLogSettings } from "@/types"

export const DEFAULT_SETTINGS = {
  showDailyCount: false,
} satisfies QuickLogSettings

export function normalizeSettings(value: unknown): QuickLogSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_SETTINGS }
  }

  const raw = value as Partial<Record<keyof QuickLogSettings, unknown>>

  return {
    showDailyCount:
      typeof raw.showDailyCount === "boolean"
        ? raw.showDailyCount
        : DEFAULT_SETTINGS.showDailyCount,
  }
}
