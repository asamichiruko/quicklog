import { describe, expect, it } from "vitest"
import { formatLogEntriesAsMarkdown, formatLogEntriesAsJson, createLogEntriesExportFile } from "./logEntryExport"

describe("formatLogEntriesAsMarkdown", () => {
  it("LogEntry[] を Markdown 形式に format できる", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id3", text: "text3a\ntext3b", createdAt: "2026-05-23T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

text1

### 21:00:00

text2

## 2026年5月23日(土)

### 09:00:00

text3a
text3b`)
  })

  it("logEntry[] は日付昇順にソートされる", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
      { id: "id3", text: "text3a\ntext3b", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

text3a
text3b

### 21:00:00

text1

## 2026年5月23日(土)

### 09:00:00

text2`)
  })

  it("空の配列は空文字列に変換される", () => {
    expect(formatLogEntriesAsMarkdown([])).toBe("")
  })
})

describe("formatLogEntriesAsJson", () => {
  it("LogEntry[] を JSON 形式に format できる", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id3", text: "text3a\ntext3b", createdAt: "2026-05-23T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsJson(logEntries)
    expect(actual).toBe(`[
  {
    "id": "id1",
    "text": "text1",
    "createdAt": "2026-05-22T00:00:00.000Z"
  },
  {
    "id": "id2",
    "text": "text2",
    "createdAt": "2026-05-22T12:00:00.000Z"
  },
  {
    "id": "id3",
    "text": "text3a\\ntext3b",
    "createdAt": "2026-05-23T00:00:00.000Z"
  }
]`)
  })

  it("logEntry[] は日付昇順にソートされる", () => {
    const logEntries = [
      { id: "id1", text: "text1", createdAt: "2026-05-22T12:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
      { id: "id3", text: "text3a\ntext3b", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsJson(logEntries)
    expect(actual).toBe(`[
  {
    "id": "id3",
    "text": "text3a\\ntext3b",
    "createdAt": "2026-05-22T00:00:00.000Z"
  },
  {
    "id": "id1",
    "text": "text1",
    "createdAt": "2026-05-22T12:00:00.000Z"
  },
  {
    "id": "id2",
    "text": "text2",
    "createdAt": "2026-05-23T00:00:00.000Z"
  }
]`)
  })

  it("空の配列は '[]' に変換される", () => {
    expect(formatLogEntriesAsJson([])).toBe("[]")
  })
})

describe("createLogEntriesExportFile", () => {
  it("ExportType に 'json' を指定したときの mimeType と extension が正しい", () => {
    const exportFile = createLogEntriesExportFile([], "json")

    expect(exportFile.content).toBe("[]")
    expect(exportFile.mimeType).toBe("application/json")
    expect(exportFile.extension).toBe(".json")
  })

  it("ExportType に 'markdown' を指定したときの mimeType と extension が正しい", () => {
    const exportFile = createLogEntriesExportFile([], "markdown")

    expect(exportFile.content).toBe("")
    expect(exportFile.mimeType).toBe("text/markdown")
    expect(exportFile.extension).toBe(".md")
  })
})
