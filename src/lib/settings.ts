import type { AppSettings } from "@/types"

export const DEFAULT_SETTINGS = {
  showTimeDistributionStrip: false,
} satisfies AppSettings

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_SETTINGS }
  }

  const raw = value as Partial<Record<keyof AppSettings, unknown>>

  return {
    showTimeDistributionStrip:
      typeof raw.showTimeDistributionStrip === "boolean"
        ? raw.showTimeDistributionStrip
        : DEFAULT_SETTINGS.showTimeDistributionStrip,
  }
}
