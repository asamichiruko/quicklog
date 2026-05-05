import type { QuickLogSettings } from "@/types"

export const DEFAULT_SETTINGS = {
  showTimeStrip: false,
} satisfies QuickLogSettings

export function normalizeSettings(value: unknown): QuickLogSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_SETTINGS }
  }

  const raw = value as Partial<Record<keyof QuickLogSettings, unknown>>

  return {
    showTimeStrip:
      typeof raw.showTimeStrip === "boolean"
        ? raw.showTimeStrip
        : DEFAULT_SETTINGS.showTimeStrip,
  }
}
