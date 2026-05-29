import type { ExportType, LogEntry } from "@/types"
import { groupLogEntriesByDate, sortLogEntriesByCreatedAtAsc, type DateGroup } from "@/lib/logEntryCollection"
import { formatLongJapaneseDate, formatTimeWithSeconds } from "@/lib/dateFormat"
import { isValidLogEntry } from "@/lib/logEntrySchema"

type ExportFile = {
  content: string
  mimeType: string
  extension: string
}

const groupsHeading = "##"
const logEntriesHeading = "###"
const markdownFenceMaxLength = 16

function validateLogEntries(logEntries: LogEntry[]): LogEntry[] {
  return logEntries.map((logEntry) => {
    if (!isValidLogEntry(logEntry)) {
      throw new Error("Invalid LogEntry")
    }
    return logEntry
  })
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, "\n")
}

function getLongestMarkerRun(text: string, marker: "`" | "~"): number {
  const matches = text.match(new RegExp(`${marker}+`, "g"))
  if (!matches) return 0

  return Math.max(...matches.map((match) => match.length))
}

function formatAsIndentedCodeBlock(text: string): string {
  return text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n")
}

function formatAsFencedCodeBlock(text: string, marker: "`" | "~", length: number): string {
  const fence = marker.repeat(length)
  return `${fence}\n${text}\n${fence}`
}

function formatLogEntryTextAsMarkdown(text: string): string {
  const normalizedText = normalizeLineEndings(text)
  const fenceCandidates = [
    { marker: "`" as const, length: Math.max(3, getLongestMarkerRun(normalizedText, "`") + 1) },
    { marker: "~" as const, length: Math.max(3, getLongestMarkerRun(normalizedText, "~") + 1) },
  ]

  const fence = fenceCandidates.find((candidate) => candidate.length <= markdownFenceMaxLength)
  if (!fence) return formatAsIndentedCodeBlock(normalizedText)

  return formatAsFencedCodeBlock(normalizedText, fence.marker, fence.length)
}

function formatLogEntryAsMarkdown(logEntry: LogEntry): string {
  return `${logEntriesHeading} ${formatTimeWithSeconds(new Date(logEntry.createdAt))}\n\n${formatLogEntryTextAsMarkdown(logEntry.text)}`
}

function formatDateGroupAsMarkdown(group: DateGroup): string {
  return [
    `${groupsHeading} ${formatLongJapaneseDate(group.date)}`,
    ...group.logEntries.map(formatLogEntryAsMarkdown),
  ].join("\n\n")
}

export function formatLogEntriesAsMarkdown(logEntries: LogEntry[]): string {
  return groupLogEntriesByDate(sortLogEntriesByCreatedAtAsc(validateLogEntries(logEntries)))
    .map(formatDateGroupAsMarkdown)
    .join("\n\n")
}

export function formatLogEntriesAsJson(logEntries: LogEntry[]): string {
  return JSON.stringify(sortLogEntriesByCreatedAtAsc(validateLogEntries(logEntries)), null, 2)
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
