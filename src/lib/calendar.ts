import { addDays, getLocalDateKey, startOfMonth } from "@/lib/date"

export function createCalendarDays(
  displayedMonth: Date,
  initialDate: Date,
  recordCounts: Map<string, number>,
) {
  const firstDay = startOfMonth(displayedMonth)
  const startDate = addDays(firstDay, -firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(startDate, index)
    const dateKey = getLocalDateKey(date)
    const count = recordCounts.get(dateKey) ?? 0

    return {
      date,
      dateKey,
      count,
      isCurrentMonth: date.getMonth() === displayedMonth.getMonth(),
      isToday: dateKey === getLocalDateKey(new Date()),
      countLevel: getCountLevel(count),
      hasLogEntries: count > 0,
      isInitialDay: dateKey === getLocalDateKey(initialDate),
    }
  })
}

function getCountLevel(count: number) {
  if (count === 0) return "none"
  if (count <= 5) return "low"
  if (count <= 10) return "medium"
  if (count <= 20) return "high"
  return "max"
}
