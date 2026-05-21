import type { ExportType, LogEntry } from "@/types"
import { groupLogEntriesByDate, sortLogEntriesByCreatedAtAsc, type DateGroup } from "@/lib/logEntryCollection"
import { formatLongJapaneseDate, formatTimeWithSeconds } from "@/lib/dateFormat"

type ExportFile = {
  content: string
  mimeType: string
  extension: string
}

const groupsHeading = "##"
const logEntriesHeading = "###"

function formatLogEntryAsMarkdown(item: LogEntry): string {
  return `${logEntriesHeading} ${formatTimeWithSeconds(new Date(item.createdAt))}\n\n${item.text}`
}

function formatDateGroupAsMarkdown(group: DateGroup): string {
  return [
    `${groupsHeading} ${formatLongJapaneseDate(group.date)}`,
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
