import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryCopyPanel from "./LogEntryCopyPanel.vue"
import type { LogEntry } from "@/types.ts"

describe("LogEntryCopyPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("期間を選択して 記録をコピー ボタンを押すと Markdown テキストがクリップボードにコピーされる", async () => {
    const user = userEvent.setup()
    render(LogEntryCopyPanel, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-21T12:00:00.000Z" },
          { id: "id2", text: "text2", createdAt: "2026-05-22T00:00:00.000Z" },
          { id: "id3", text: "text3", createdAt: "2026-05-22T12:00:00.000Z" },
        ],
      }
    })

    await fireEvent.update(screen.getByLabelText("開始"), "2026-05-22")
    await fireEvent.update(screen.getByLabelText("終了"), "2026-05-22")
    await user.click(screen.getByText("コピー内容"))

    const preview = screen.getByRole("textbox", {
      name: "コピーする Markdown テキスト",
    }) as HTMLTextAreaElement
    expect(preview.value).toContain("text2")

    const copyButton = screen.getByRole("button", { name: "クリップボードにコピー" })
    expect(copyButton).toBeEnabled()

    await user.click(copyButton)

    const copiedText = await window.navigator.clipboard.readText()
    expect(copiedText).toContain("text2")
    expect(copiedText).toContain("text3")
    expect(copiedText).not.toContain("text1")
    expect(screen.getByText("クリップボードにコピーしました")).toBeInTheDocument()
  })

  it("初期状態で開始日と終了日が今日にセットされている", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22))

    render(LogEntryCopyPanel, {
      props: {
        logEntries: [],
      }
    })

    const startDateInput = screen.getByLabelText("開始") as HTMLInputElement
    const endDateInput = screen.getByLabelText("終了") as HTMLInputElement
    expect(startDateInput.value).toBe("2026-05-22")
    expect(endDateInput.value).toBe("2026-05-22")
  })

  it("記録がない期間を選択すると記録をコピーできない", async () => {
    render(LogEntryCopyPanel, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-21T12:00:00.000Z" },
          { id: "id2", text: "text2", createdAt: "2026-05-22T00:00:00.000Z" },
          { id: "id3", text: "text3", createdAt: "2026-05-22T12:00:00.000Z" },
        ],
      }
    })

    await fireEvent.update(screen.getByLabelText("開始"), "2026-05-23")
    await fireEvent.update(screen.getByLabelText("終了"), "2026-05-23")

    const copyButton = screen.getByRole("button", { name: "クリップボードにコピー" })
    expect(copyButton).toBeDisabled()

    expect(screen.getByText("指定範囲に記録がありません")).toBeInTheDocument()
  })

  it("開始期間が終了日より後だと記録をコピーできない", async () => {
    render(LogEntryCopyPanel, {
      props: {
        logEntries: [],
      }
    })

    await fireEvent.update(screen.getByLabelText("開始"), "2026-05-22")
    await fireEvent.update(screen.getByLabelText("終了"), "2026-05-20")

    const copyButton = screen.getByRole("button", { name: "クリップボードにコピー" })
    expect(copyButton).toBeDisabled()

    expect(screen.getByText("開始日が終了日より後です")).toBeInTheDocument()
  })

  it("有効な日付を指定していないと記録をコピーできない", async () => {
    render(LogEntryCopyPanel, {
      props: {
        logEntries: [],
      }
    })

    await fireEvent.update(screen.getByLabelText("開始"), "")

    const copyButton = screen.getByRole("button", { name: "クリップボードにコピー" })
    expect(copyButton).toBeDisabled()

    expect(screen.getByText("有効な日付を指定してください")).toBeInTheDocument()
  })

  it("invalid なデータが含まれていると記録をコピーできない", async () => {
    render(LogEntryCopyPanel, {
      props: {
        logEntries: [
          { name: "invalid data", createdAt: "2026-05-21T12:00:00.000Z" }
        ] as unknown as LogEntry[],
      }
    })

    await fireEvent.update(screen.getByLabelText("開始"), "2026-05-21")
    await fireEvent.update(screen.getByLabelText("終了"), "2026-05-21")

    const copyButton = screen.getByRole("button", { name: "クリップボードにコピー" })
    expect(copyButton).toBeDisabled()

    expect(screen.getByText("データが破損しています")).toBeInTheDocument()
  })
})
