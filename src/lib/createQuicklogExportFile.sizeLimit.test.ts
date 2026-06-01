import type { QuicklogData } from "@/types"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.doUnmock("@/lib/sizeLimits")
  vi.resetModules()
})

describe("formatLogEntriesAsMarkdown size limit", () => {
  it("Markdown export のサイズ上限を超えると例外を出す", async () => {
    vi.resetModules()

    vi.doMock("@/lib/sizeLimits", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/sizeLimits")>()

      return {
        ...actual,
        MAX_EXPORT_FILE_BYTES: 80,
      }
    })

    const { formatLogEntriesAsMarkdown } = await import("./createQuicklogExportFile")
    const { SizeError } = await import("@/lib/errors")

    const logEntries = [
      {
        id: "id1",
        text: "a".repeat(100),
        createdAt: "2026-05-22T00:00:00.000Z",
      },
    ]

    expect(() => formatLogEntriesAsMarkdown(logEntries)).toThrow(SizeError)
  })
})

describe("formatQuicklogDataAsJson size limit", () => {
  it("JSON export のサイズ上限を超えると例外を出す", async () => {
    vi.resetModules()

    vi.doMock("@/lib/sizeLimits", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/sizeLimits")>()

      return {
        ...actual,
        MAX_EXPORT_FILE_BYTES: 80,
      }
    })

    const { formatQuicklogDataAsJson } = await import("./createQuicklogExportFile")
    const { SizeError } = await import("@/lib/errors")

    const quicklogData = {
      version: 2,
      logEntries: [
        {
          id: "id1",
          text: "a".repeat(100),
          createdAt: "2026-05-22T00:00:00.000Z",
        },
      ],
      syncOperations: [],
    } satisfies QuicklogData

    expect(() => formatQuicklogDataAsJson(quicklogData)).toThrow(SizeError)
  })
})
