export function getUtf8ByteLength(text: string) {
  const encoder = new TextEncoder()
  return encoder.encode(text).byteLength
}

// localStorage の容量制限はブラウザ依存で約 5 MB
export const MAX_QUICKLOG_DATA_STORAGE_BYTES = 4 * 1024 * 1024
export const MAX_LOG_ENTRIES_STORAGE_BYTES = 4 * 1024 * 1024
export const MAX_SETTINGS_STORAGE_BYTES = 1024 * 1024

export const MAX_LOG_ENTRY_TEXT_BYTES = 256 * 1024
export const MAX_IMPORT_FILE_BYTES = MAX_QUICKLOG_DATA_STORAGE_BYTES
export const MAX_EXPORT_FILE_BYTES = MAX_QUICKLOG_DATA_STORAGE_BYTES
