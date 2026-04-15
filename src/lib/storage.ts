import type { QuickLogItem } from "@/types";

const KEY = "quicklog.items"

export function loadItems(): QuickLogItem[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveItems(items: QuickLogItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}
