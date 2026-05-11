import type { LogEntry } from "@/types"

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
})

const heading = "##"

function formatLogEntryAsMarkdown(item: LogEntry): string {
  return `${heading} ${dateTimeFormatter.format(new Date(item.createdAt))}\n\n${item.text}`
}

export function formatLogEntriesAsMarkdown(items: LogEntry[]): string {
  return items
    .map((item) => formatLogEntryAsMarkdown(item))
    .join("\n\n")
}

export function formatLogEntriesAsJson(items: LogEntry[]): string {
  return JSON.stringify(items, null, 2)
}
