import type { AppSettings } from "@/types"

export const DEFAULT_SETTINGS = {
  showTimeStrip: false,
} satisfies AppSettings

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_SETTINGS }
  }

  const raw = value as Partial<Record<keyof AppSettings, unknown>>

  return {
    showTimeStrip:
      typeof raw.showTimeStrip === "boolean"
        ? raw.showTimeStrip
        : DEFAULT_SETTINGS.showTimeStrip,
  }
}
