import { MAX_LOG_ENTRIES_IMPORT_FILE_BYTES } from "./logEntrySchema"

export function downloadTextFile(file: {
  content: string
  mimeType: string
  filename: string
}) {
  const blob = new Blob([file.content], { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")

  a.href = url
  a.download = file.filename
  a.click()

  URL.revokeObjectURL(url)
}

export async function readLogEntriesImportFile(file: File): Promise<unknown> {
  if (file.size > MAX_LOG_ENTRIES_IMPORT_FILE_BYTES) {
    throw new Error("Import file is too large.")
  }

  const text = await file.text()
  return JSON.parse(text)
}
