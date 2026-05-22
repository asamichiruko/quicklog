import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings"

describe("normalizeSettings", () => {
  it("valid な settings をそのまま正規化する", () => {
    expect(normalizeSettings({ showDailySummary: true })).toEqual({
      showDailySummary: true,
    })
  })

  it("不正値の場合は DEFAULT_SETTINGS を返す", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings("invalid")).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS)
  })

  it("プロパティが不正な場合は、その項目だけ DEFAULT_SETTINGS を使う", () => {
    expect(normalizeSettings({ showDailySummary: "true" })).toEqual({
      showDailySummary: DEFAULT_SETTINGS.showDailySummary,
    })
  })
})
