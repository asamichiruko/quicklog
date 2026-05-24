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
