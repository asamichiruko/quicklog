import { describe, expect, it } from "vitest"
import { formatLogEntriesAsMarkdown, formatQuicklogDataAsJson, createQuicklogExportFile } from "./createQuicklogExportFile"
import type { QuicklogData } from "@/types"

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

\`\`\`
text1
\`\`\`

### 21:00:00

\`\`\`
text2
\`\`\`

## 2026年5月23日(土)

### 09:00:00

\`\`\`
text3a
text3b
\`\`\``)
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

\`\`\`
text3a
text3b
\`\`\`

### 21:00:00

\`\`\`
text1
\`\`\`

## 2026年5月23日(土)

### 09:00:00

\`\`\`
text2
\`\`\``)
  })

  it("空の配列は空文字列に変換される", () => {
    expect(formatLogEntriesAsMarkdown([])).toBe("")
  })

  it("本文中の Markdown 書式は fenced code block として出力される", () => {
    const logEntries = [
      { id: "id1", text: "# heading\n- list item\n> quote", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

\`\`\`
# heading
- list item
> quote
\`\`\``)
  })

  it("本文中に backtick fence があるときは、より長い backtick fence で囲む", () => {
    const logEntries = [
      { id: "id1", text: "before\n```js\nalert(1)\n```\nafter", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

\`\`\`\`
before
\`\`\`js
alert(1)
\`\`\`
after
\`\`\`\``)
  })

  it("本文中の backtick fence が長すぎるときは tilde fence で囲む", () => {
    const logEntries = [
      { id: "id1", text: `before\n${"`".repeat(16)}\nafter`, createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

~~~
before
${"`".repeat(16)}
after
~~~`)
  })

  it("本文中の backtick と tilde fence が長すぎるときはインデントコードブロックにする", () => {
    const logEntries = [
      {
        id: "id1",
        text: `before\n${"`".repeat(16)}\n${"~".repeat(16)}\nafter`,
        createdAt: "2026-05-22T00:00:00.000Z",
      },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

    before
    ${"`".repeat(16)}
    ${"~".repeat(16)}
    after`)
  })

  it("本文の改行コードは LF に統一される", () => {
    const logEntries = [
      { id: "id1", text: "text1\r\ntext2\rtext3", createdAt: "2026-05-22T00:00:00.000Z" },
    ]

    const actual = formatLogEntriesAsMarkdown(logEntries)
    expect(actual).toBe(`## 2026年5月22日(金)

### 09:00:00

\`\`\`
text1
text2
text3
\`\`\``)
  })
})

describe("formatQuicklogDataAsJson", () => {
  it("QuicklogData を JSON 形式に format できる", () => {
    const quicklogData = {
      version: 3,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-05-22T12:00:00.000Z" },
        { id: "id3", text: "text3a\ntext3b", createdAt: "2026-05-23T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { createdAt: "2026-06-01T12:00:00.000Z", logEntryId: "id4" },
      ]
    } satisfies QuicklogData

    const actual = formatQuicklogDataAsJson(quicklogData)
    expect(actual).toBe(`{
  "version": 3,
  "logEntries": [
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
  ],
  "logEntryDeletions": [
    {
      "createdAt": "2026-06-01T12:00:00.000Z",
      "logEntryId": "id4"
    }
  ]
}`)
  })

  it("logEntry[] は日付昇順にソートされる", () => {
    const quicklogData = {
      version: 3,
      logEntries: [
        { id: "id1", text: "text1", createdAt: "2026-05-22T12:00:00.000Z" },
        { id: "id2", text: "text2", createdAt: "2026-05-23T00:00:00.000Z" },
        { id: "id3", text: "text3a\ntext3b", createdAt: "2026-05-22T00:00:00.000Z" },
      ],
      logEntryDeletions: [
        { createdAt: "2026-06-01T12:00:00.000Z", logEntryId: "id4" },
      ]
    } satisfies QuicklogData

    const actual = formatQuicklogDataAsJson(quicklogData)
    expect(actual).toBe(`{
  "version": 3,
  "logEntries": [
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
  ],
  "logEntryDeletions": [
    {
      "createdAt": "2026-06-01T12:00:00.000Z",
      "logEntryId": "id4"
    }
  ]
}`)
  })
})

describe("createQuicklogExportFile", () => {
  it("ExportType に 'json' を指定したときの mimeType と extension が正しい", () => {
    const exportFile = createQuicklogExportFile({ version: 3, logEntries: [], logEntryDeletions: [] }, "json")

    expect(exportFile.content).toBe(`{
  "version": 3,
  "logEntries": [],
  "logEntryDeletions": []
}`)
    expect(exportFile.mimeType).toBe("application/json")
    expect(exportFile.extension).toBe(".json")
  })

  it("ExportType に 'markdown' を指定したときの mimeType と extension が正しい", () => {
    const exportFile = createQuicklogExportFile({ version: 3, logEntries: [], logEntryDeletions: [] }, "markdown")

    expect(exportFile.content).toBe("")
    expect(exportFile.mimeType).toBe("text/markdown")
    expect(exportFile.extension).toBe(".md")
  })
})
