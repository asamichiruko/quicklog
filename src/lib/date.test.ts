import { describe, expect, it } from "vitest"
import { addDays, addMonths, getDateGroupId, getLocalDateKey, startOfLocalDay, startOfMonth } from "./date"

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

describe("getDateGroupId", () => {
  it("正規の Date オブジェクトから date-group-id が得られる", () => {
    const date = new Date(2026, 4, 1, 12, 34, 56, 789)
    expect(getDateGroupId(date)).toEqual("date-group-2026-05-01")
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => { getDateGroupId(invalidDate) }).toThrow()
  })
})

describe("startOfMonth", () => {
  it("正規の Date オブジェクトから 月初を指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(startOfMonth(date)).toEqual(new Date(2026, 4, 1))
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => { startOfMonth(invalidDate) }).toThrow()
  })
})

describe("addMonths", () => {
  it("amount 月先の月初めの日を指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addMonths(date, 1)).toEqual(new Date(2026, 5, 1))
  })

  it("amount 月前の月初めの日を指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addMonths(date, -1)).toEqual(new Date(2026, 3, 1))
  })

  it("amount が 0 のとき、その月の月初めを指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addMonths(date, 0)).toEqual(new Date(2026, 4, 1))
  })

  it("年を跨いでも正しく amount だけ先の月が得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addMonths(date, 12)).toEqual(new Date(2027, 4, 1))
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => { addMonths(invalidDate, 0) }).toThrow()
  })
})

describe("addDays", () => {
  it("amount 日先を指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addDays(date, 1)).toEqual(new Date(2026, 4, 23))
  })

  it("amount 日前の日を指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addDays(date, -1)).toEqual(new Date(2026, 4, 21))
  })

  it("amount が 0 のとき、その日の開始時刻を指す Date オブジェクトが得られる", () => {
    const date = new Date(2026, 4, 22, 12, 34, 56, 789)
    expect(addDays(date, 0)).toEqual(new Date(2026, 4, 22))
  })

  it("月を跨いでも正しく amount だけ先の日が得られる", () => {
    const date = new Date(2026, 4, 31, 12, 34, 56, 789)
    expect(addDays(date, 1)).toEqual(new Date(2026, 5, 1))
  })

  it("うるう年の 2 月を跨いでも正しく処理できる", () => {
    const date = new Date(2024, 1, 28, 12, 34, 56, 789)
    expect(addDays(date, 1)).toEqual(new Date(2024, 1, 29))
    expect(addDays(date, 2)).toEqual(new Date(2024, 2, 1))
  })

  it("不正な Date オブジェクトを与えると例外を出す", () => {
    const invalidDate = new Date(Number.NaN)
    expect(() => { addDays(invalidDate, 0) }).toThrow()
  })
})
