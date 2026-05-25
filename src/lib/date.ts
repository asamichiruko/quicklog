export function getLocalDateKey(date: Date) {
  if (isNaN(date.getTime())) {
    throw new Error()
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function startOfLocalDay(date: Date) {
  if (isNaN(date.getTime())) {
    throw new Error()
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getDateGroupId(date: Date) {
  return `date-group-${getLocalDateKey(date)}`
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function addDays(date: Date, amount: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return startOfLocalDay(nextDate)
}
