import { afterEach, describe, expect, it, vi } from "vitest"
import { createCalendarDays } from "./calendar"

describe("createCalendarDays", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("指定した月を完全に含む日曜始まりの 42 日分の日付情報が得られる", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22))

    const logEntryCountsByDate = new Map<string, number>([
      ["2026-04-25", 1],
      ["2026-04-26", 1],
      ["2026-05-01", 1],
      ["2026-05-31", 1],
      ["2026-06-06", 1],
      ["2026-06-07", 1],
    ])

    const days = createCalendarDays(
      new Date(2026, 4, 1),
      new Date(2026, 4, 15),
      logEntryCountsByDate,
    )

    expect(days).toHaveLength(42)
    expect(days[0].dateKey).toBe("2026-04-26")
    expect(days[0].date.getDay()).toBe(0)
    expect(days[41].dateKey).toBe("2026-06-06")
    expect(days[41].date.getDay()).toBe(6)

    expect(findDay(days, "2026-04-25")).toBeUndefined()
    expect(findDay(days, "2026-06-07")).toBeUndefined()
    expect(findDay(days, "2026-05-01")).toMatchObject({ isCurrentMonth: true })
    expect(findDay(days, "2026-05-31")).toMatchObject({ isCurrentMonth: true })
    expect(findDay(days, "2026-04-30")).toMatchObject({ isCurrentMonth: false })
    expect(findDay(days, "2026-06-01")).toMatchObject({ isCurrentMonth: false })
  })

  it("記録件数に応じた状態が得られる", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22))

    const logEntryCounts = new Map<string, number>([
      ["2026-05-01", 1],
      ["2026-05-02", 5],
      ["2026-05-03", 6],
      ["2026-05-04", 10],
      ["2026-05-05", 11],
      ["2026-05-06", 20],
      ["2026-05-07", 21],
    ])

    const days = createCalendarDays(new Date(2026, 4, 1), new Date(2026, 4, 15), logEntryCounts)

    expect(findDay(days, "2026-05-01")).toMatchObject({
      count: 1,
      countLevel: "low",
      hasLogEntries: true,
    })
    expect(findDay(days, "2026-05-02")).toMatchObject({ countLevel: "low" })
    expect(findDay(days, "2026-05-03")).toMatchObject({ countLevel: "medium" })
    expect(findDay(days, "2026-05-04")).toMatchObject({ countLevel: "medium" })
    expect(findDay(days, "2026-05-05")).toMatchObject({ countLevel: "high" })
    expect(findDay(days, "2026-05-06")).toMatchObject({ countLevel: "high" })
    expect(findDay(days, "2026-05-07")).toMatchObject({ countLevel: "max" })
    expect(findDay(days, "2026-05-08")).toMatchObject({
      count: 0,
      countLevel: "none",
      hasLogEntries: false,
    })
  })

  it("今日と初期日を判定できる", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22))

    const days = createCalendarDays(new Date(2026, 4, 1), new Date(2026, 4, 15), new Map())

    expect(findDay(days, "2026-05-15")).toMatchObject({ isInitialDay: true })
    expect(findDay(days, "2026-05-22")).toMatchObject({ isToday: true })
    expect(findDay(days, "2026-05-16")).toMatchObject({
      isInitialDay: false,
      isToday: false,
    })
  })
})

type CalendarDay = ReturnType<typeof createCalendarDays>[number]

function findDay(days: CalendarDay[], dateKey: string) {
  return days.find((day) => day.dateKey === dateKey)
}
