export type LogEntry = {
  id: string
  text: string
  createdAt: string
}

export type AppSettings = {
  showDailySummary: boolean
}

export type ExportType = "json" | "markdown"

export type SyncOperationType = "delete"

export type SyncOperation =
  | {
    id: string
    type: "delete"
    entryId: string
    createdAt: string
  }

export type QuicklogData = {
  version: number
  logEntries: LogEntry[]
  syncOperations: SyncOperation[]
}
