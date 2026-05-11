import type { ExportType, LogEntry } from "@/types"

type ExportFile = {
  content: string
  mimeType: string
  extension: string
}

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
