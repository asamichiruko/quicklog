import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryExportPanel from "./LogEntryExportPanel.vue"

describe("LogEntryExportPanel", () => {
  it("初期状態で JSON 形式が選択されている", () => {
    render(LogEntryExportPanel)

    const exportTypeJson = screen.getByRole("radio", { name: "JSON" })
    expect(exportTypeJson).toBeChecked()
  })

  it("ファイルをダウンロード ボタンを押すと export される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryExportPanel)

    const exportTypeMarkdown = screen.getByRole("radio", { name: "Markdown" })
    await user.click(exportTypeMarkdown)
    expect(exportTypeMarkdown).toBeChecked()

    const exportButton = screen.getByRole("button", { name: "ファイルをダウンロード" })
    await user.click(exportButton)

    expect(emitted("export")).toEqual([["markdown"]])
  })
})
