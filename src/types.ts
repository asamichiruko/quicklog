export type LogEntry = {
  id: string
  text: string
  createdAt: string
}

export type AppSettings = {
  showDailySummary: boolean
}

export type ExportType = "json" | "markdown"

export type LogEntryDeletion = {
  entryId: string
  createdAt: string
}

export type QuicklogData = {
  version: 3
  logEntries: LogEntry[]
  logEntryDeletions: LogEntryDeletion[]
}
