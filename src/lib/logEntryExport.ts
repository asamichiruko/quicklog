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
    ...group.logEntries.map(formatLogEntryAsMarkdown),
  ].join("\n\n")
}

export function formatLogEntriesAsMarkdown(logEntries: LogEntry[]): string {
  return groupLogEntriesByDate(sortLogEntriesByCreatedAtAsc(logEntries))
    .map(formatDateGroupAsMarkdown)
    .join("\n\n")
}

export function formatLogEntriesAsJson(logEntries: LogEntry[]): string {
  return JSON.stringify(sortLogEntriesByCreatedAtAsc(logEntries), null, 2)
}

const exportFormats: Record<
  ExportType,
  {
    format: (logEntries: LogEntry[]) => string
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

export function createLogEntriesExportFile(logEntries: LogEntry[], exportType: ExportType): ExportFile {
  const exportFormat = exportFormats[exportType]

  return {
    content: exportFormat.format(logEntries),
    mimeType: exportFormat.mimeType,
    extension: exportFormat.extension,
  }
}
