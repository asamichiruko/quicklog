import { MAX_LOG_ENTRIES_IMPORT_FILE_BYTES } from "@/lib/sizeLimits"
import { SizeError } from "@/lib/error"

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
    throw new SizeError("Import file is too large.", {
      target: "import",
      limitBytes: MAX_LOG_ENTRIES_IMPORT_FILE_BYTES,
      actualBytes: file.size,
    })
  }

  const text = await file.text()
  return JSON.parse(text)
}
