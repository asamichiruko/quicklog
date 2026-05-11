import type { ExportType, LogEntry } from "@/types"
import { groupLogEntriesByDate, type DateGroup } from "@/lib/logEntries"

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

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
})

const groupsHeading = "##"
const logEntriesHeading = "###"

function formatLogEntryAsMarkdown(item: LogEntry): string {
  return `${logEntriesHeading} ${timeFormatter.format(new Date(item.createdAt))}\n\n${item.text}`
}

function formatDateGroupAsMarkdown(group: DateGroup): string {
  return [
    `${groupsHeading} ${dateFormatter.format(group.date)}`,
    ...group.items.map(formatLogEntryAsMarkdown),
  ].join("\n\n")
}

export function formatLogEntriesAsMarkdown(items: LogEntry[]): string {
  return groupLogEntriesByDate(items)
    .map(formatDateGroupAsMarkdown)
    .join("\n\n")
}

export function formatLogEntriesAsJson(items: LogEntry[]): string {
  return JSON.stringify(items, null, 2)
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
