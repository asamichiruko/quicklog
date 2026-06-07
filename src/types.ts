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
  logEntryId: string
  createdAt: string
}

export type QuicklogData = {
  version: 3
  logEntries: LogEntry[]
  logEntryDeletions: LogEntryDeletion[]
}

export type StoredDataScope =
  | { type: "anonymous" }
  | { type: "user"; userId: string }

export type RuntimeSessionState =
  | { type: "anonymous" }
  | { type: "authenticated"; userId: string }
  | { type: "sessionLost"; userId: string }
