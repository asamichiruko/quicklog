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
