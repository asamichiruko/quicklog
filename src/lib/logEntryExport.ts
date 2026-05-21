import type { ExportType, LogEntry } from "@/types"
import { groupLogEntriesByDate, sortLogEntriesByCreatedAtAsc, type DateGroup } from "@/lib/logEntries"

type ExportFile = {
  content: string
  mimeType: string
  extension: string
}

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
})

const groupsHeading = "##"
const logEntriesHeading = "###"

function formatTime(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${hour}:${minute}:${second}`
}

function formatLogEntryAsMarkdown(item: LogEntry): string {
  return `${logEntriesHeading} ${formatTime(new Date(item.createdAt))}\n\n${item.text}`
}

function formatDateGroupAsMarkdown(group: DateGroup): string {
  return [
    `${groupsHeading} ${dateFormatter.format(group.date)}`,
    ...group.items.map(formatLogEntryAsMarkdown),
  ].join("\n\n")
}

export function formatLogEntriesAsMarkdown(items: LogEntry[]): string {
  return groupLogEntriesByDate(sortLogEntriesByCreatedAtAsc(items))
    .map(formatDateGroupAsMarkdown)
    .join("\n\n")
}

export function formatLogEntriesAsJson(items: LogEntry[]): string {
  return JSON.stringify(sortLogEntriesByCreatedAtAsc(items), null, 2)
}

const exportFormats: Record<
  ExportType,
  {
    format: (items: LogEntry[]) => string
    mimeType: string
    extension: string
  }
> = {
  json: {
    format: formatLogEntriesAsJson,
    mimeType: "application/json",
    extension: ".json",
  },
  markdown: {
    format: formatLogEntriesAsMarkdown,
    mimeType: "text/markdown",
    extension: ".md",
  },
}

export function createLogEntriesExportFile(items: LogEntry[], exportType: ExportType): ExportFile {
  const exportFormat = exportFormats[exportType]

  return {
    content: exportFormat.format(items),
    mimeType: exportFormat.mimeType,
    extension: exportFormat.extension,
  }
}
