import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryExportPanel from "./LogEntryExportPanel.vue"

describe("LogEntryExportPanel", () => {
  it("初期状態で JSON 形式が選択されている", () => {
    render(LogEntryExportPanel, { props: { downloadLogEntries: vi.fn() } })

    const exportTypeJson = screen.getByRole("radio", { name: "JSON" })
    expect(exportTypeJson).toBeChecked()
  })

  it("ファイルをダウンロード ボタンを押すと export される", async () => {
    const downloadLogEntries = vi.fn()

    const user = userEvent.setup()
    render(LogEntryExportPanel, { props: { downloadLogEntries } })

    const exportTypeMarkdown = screen.getByRole("radio", { name: "Markdown" })
    await user.click(exportTypeMarkdown)
    expect(exportTypeMarkdown).toBeChecked()

    const exportButton = screen.getByRole("button", { name: "ファイルをダウンロード" })
    await user.click(exportButton)

    expect(downloadLogEntries).toHaveBeenCalledWith("markdown")
    expect(screen.getByText("エクスポートに成功しました")).toBeInTheDocument()
  })

  it("ダウンロードに失敗するとエラーが表示される", async () => {
    const error = new Error("ダウンロードエラー")
    const downloadLogEntries = vi.fn(() => {
      throw error
    })

    const user = userEvent.setup()
    render(LogEntryExportPanel, { props: { downloadLogEntries } })

    await user.click(screen.getByRole("button", { name: "ファイルをダウンロード" }))

    expect(downloadLogEntries).toHaveBeenCalledWith("json")
    expect(screen.getByText("エクスポートに失敗しました")).toBeInTheDocument()
  })
})
