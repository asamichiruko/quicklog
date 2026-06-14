import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatTimeWithSeconds, formatLongJapaneseDate, formatRelativeDate } from "./dateFormat"
import { InvalidDateError } from "@/errors"

describe("formatTimeWithSeconds", () => {
  it("正規の Date オブジェクトから HH:MM:SS 形式の文字列を取得できる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)

    expect(formatTimeWithSeconds(date)).toEqual("12:34:56")
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => {
      formatTimeWithSeconds(invalidDate)
    }).toThrow(InvalidDateError)
  })
})

describe("formatLongJapaneseDate", () => {
  it("正規の Date オブジェクトから日本時間で長い形式の日付文字列を取得できる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(formatLongJapaneseDate(date)).toEqual("2026年5月22日(金)")
  })

  it("不正な date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => {
      formatLongJapaneseDate(invalidDate)
    }).toThrow(InvalidDateError)
  })
})

describe("formatRelativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("現在時刻からの相対日付を取得できる", () => {
    const now = new Date(2026, 4, 22, 12, 34, 56, 789)
    vi.setSystemTime(now)

    expect(formatRelativeDate(new Date(2026, 4, 22, 0, 0, 0, 0))).toBe("今日")
    expect(formatRelativeDate(new Date(2026, 4, 21, 23, 59, 59, 999))).toBe("昨日")

    expect(formatRelativeDate(new Date(2026, 4, 22, 23, 59, 59, 999))).toBe("今日")
    expect(formatRelativeDate(new Date(2026, 4, 23, 0, 0, 0, 0))).toBe("明日")

    expect(formatRelativeDate(new Date(2026, 4, 20, 23, 59, 59, 999))).toBe("2日前")

    expect(formatRelativeDate(new Date(2026, 4, 24, 0, 0, 0, 0))).toBe("2日後")
  })

  it("不正な date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => {
      formatRelativeDate(invalidDate)
    }).toThrow(InvalidDateError)
  })
})
