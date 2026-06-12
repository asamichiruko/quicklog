import { startOfLocalDay } from "@/lib/date"
import { InvalidDateError } from "@/lib/errors"

export function formatTimeWithSeconds(date: Date) {
  if (isNaN(date.getTime())) {
    throw new InvalidDateError("Invalid date.")
  }

  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${hour}:${minute}:${second}`
}

const longDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
})

export function formatLongJapaneseDate(date: Date) {
  if (isNaN(date.getTime())) {
    throw new InvalidDateError("Invalid date.")
  }

  return longDateFormatter.format(date)
}

export function formatRelativeDate(date: Date) {
  if (isNaN(date.getTime())) {
    throw new InvalidDateError("Invalid date.")
  }

  const today = startOfLocalDay(new Date())
  const target = startOfLocalDay(date)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return "今日"
  if (diffDays === -1) return "昨日"
  if (diffDays === 1) return "明日"
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`

  return `${diffDays}日後`
}
