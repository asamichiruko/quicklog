import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryImportPanel from "./LogEntryImportPanel.vue"

describe("LogEntryImportPanel", () => {
  it("初期状態でファイルが選択されていない", () => {
    render(LogEntryImportPanel)

    const importButton = screen.getByRole("button", { name: "ファイルをインポート" })
    expect(importButton).toBeDisabled()

    expect(screen.getByText("選択されていません")).toBeInTheDocument()
  })

  it("ファイルを選択して ファイルをインポート ボタンを押すと import される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryImportPanel)

    const importButton = screen.getByRole("button", { name: "ファイルをインポート" })
    expect(importButton).toBeDisabled()

    const file = new File(
      [JSON.stringify([{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }])],
      "quicklog.json",
      { type: "application/json" },
    )
    await user.upload(screen.getByLabelText("インポートする JSON ファイル"), file)

    expect(importButton).toBeEnabled()
    expect(screen.getByText("quicklog.json")).toBeInTheDocument()

    await user.click(importButton)

    expect(emitted("import")).toEqual([[file]])
  })
})
