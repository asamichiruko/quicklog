import { InvalidDateError } from "@/lib/error"

function isValidDate(date: Date) {
  return !isNaN(date.getTime())
}

export function getLocalDateKey(date: Date) {
  if (!isValidDate(date)) throw new InvalidDateError("Invalid date.")

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function startOfLocalDay(date: Date) {
  if (!isValidDate(date)) throw new InvalidDateError("Invalid date.")

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getDateGroupId(date: Date) {
  if (!isValidDate(date)) throw new InvalidDateError("Invalid date.")

  return `date-group-${getLocalDateKey(date)}`
}

export function startOfMonth(date: Date) {
  if (!isValidDate(date)) throw new InvalidDateError("Invalid date.")

  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, amount: number) {
  if (!isValidDate(date)) throw new InvalidDateError("Invalid date.")

  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function addDays(date: Date, amount: number) {
  if (!isValidDate(date)) throw new InvalidDateError("Invalid date.")

  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return startOfLocalDay(nextDate)
}
