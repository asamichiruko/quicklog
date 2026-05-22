import { describe, expect, it } from "vitest"
import { getLocalDateKey, startOfLocalDay } from "./date"

describe("getLocalDateKey", () => {
  it("正規の Date オブジェクトから YYYY-MM-DD 形式の文字列を取得できる", () => {
    expect(getLocalDateKey(new Date(2026, 4, 1))).toBe("2026-05-01")
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => { getLocalDateKey(invalidDate) }).toThrow()
  })
})

describe("startOfLocalDay", () => {
  it("正規の Date オブジェクトからその日付の開始時点が得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(startOfLocalDay(date)).toEqual(new Date(2026, 4, 22, 0, 0, 0, 0))
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => { startOfLocalDay(invalidDate) }).toThrow()
  })
})
