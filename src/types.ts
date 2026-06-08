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

export type DataScope =
  | { type: "anonymous" }
  | { type: "user"; userId: string }

export type RuntimeSessionState =
  | { scope: { type: "anonymous" }; syncStatus: "disabled" }
  | { scope: { type: "user"; userId: string }; syncStatus: "authenticated" }
  | { scope: { type: "user"; userId: string }; syncStatus: "authPending" }
  | { scope: { type: "user"; userId: string }; syncStatus: "sessionLost" }
