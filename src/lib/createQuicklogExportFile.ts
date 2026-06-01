import type { ExportType, LogEntry, QuicklogData } from "@/types"
import { groupLogEntriesByDate, sortLogEntriesByCreatedAtAsc, type DateGroup } from "@/lib/logEntryCollection"
import { formatLongJapaneseDate, formatTimeWithSeconds } from "@/lib/dateFormat"
import { getUtf8ByteLength, MAX_EXPORT_FILE_BYTES } from "@/lib/sizeLimits"
import { SchemaValidationError, SizeError } from "@/lib/errors"
import { parseAsQuicklogData } from "./quicklogDataMigration"
import { isValidLogEntry } from "./logEntrySchema"

type ExportFile = {
  content: string
  mimeType: string
  extension: string
}

const groupsHeading = "##"
const logEntriesHeading = "###"
const markdownFenceMaxLength = 16

function createSizeLimitedTextBuilder(maxBytes: number) {
  const parts: string[] = []
  let bytes = 0

  function append(text: string) {
    bytes += getUtf8ByteLength(text)

    if (bytes > maxBytes) {
      throw new SizeError("Export file is too large.", { target: "export", limitBytes: maxBytes, actualBytes: bytes })
    }

    parts.push(text)
  }

  return {
    appendSeparated(text: string, separator = "\n\n") {
      if (parts.length > 0) append(separator)
      append(text)
    },
    toString() {
      return parts.join("")
    },
  }
}

function validateLogEntries(logEntries: LogEntry[]): LogEntry[] {
  return logEntries.map((logEntry) => {
    if (!isValidLogEntry(logEntry)) {
      throw new SchemaValidationError("Invalid LogEntry object.")
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

function appendDateGroupAsMarkdown(
  builder: ReturnType<typeof createSizeLimitedTextBuilder>,
  group: DateGroup,
) {
  builder.appendSeparated(`${groupsHeading} ${formatLongJapaneseDate(group.date)}`)

  for (const logEntry of group.logEntries) {
    builder.appendSeparated(formatLogEntryAsMarkdown(logEntry))
  }
}

export function formatLogEntriesAsMarkdown(logEntries: LogEntry[]): string {
  const groupedLogEntries = groupLogEntriesByDate(sortLogEntriesByCreatedAtAsc(validateLogEntries(logEntries)))
  const builder = createSizeLimitedTextBuilder(MAX_EXPORT_FILE_BYTES)

  for (const group of groupedLogEntries) {
    appendDateGroupAsMarkdown(builder, group)
  }

  return builder.toString()
}

export function formatQuicklogDataAsJson(quicklogData: QuicklogData): string {
  const normalized = parseAsQuicklogData(quicklogData)
  const formatted = JSON.stringify({
    ...normalized,
    logEntries: sortLogEntriesByCreatedAtAsc(normalized.logEntries),
  }, null, 2)

  if (getUtf8ByteLength(formatted) > MAX_EXPORT_FILE_BYTES) {
    throw new SizeError("Export file is too large.", {
      target: "export",
      limitBytes: MAX_EXPORT_FILE_BYTES,
      actualBytes: getUtf8ByteLength(formatted),
    })
  }

  return formatted
}

const exportFormats: Record<
  ExportType,
  {
    format: (data: QuicklogData) => string
    mimeType: string
    extension: string
  }
> = {
  json: {
    format: formatQuicklogDataAsJson,
    mimeType: "application/json",
    extension: ".json",
  },
  markdown: {
    format: (data) => formatLogEntriesAsMarkdown(data.logEntries),
    mimeType: "text/markdown",
    extension: ".md",
  },
}

export function createQuicklogExportFile(quicklogData: QuicklogData, exportType: ExportType): ExportFile {
  const exportFormat = exportFormats[exportType]

  return {
    content: exportFormat.format(quicklogData),
    mimeType: exportFormat.mimeType,
    extension: exportFormat.extension,
  }
}
