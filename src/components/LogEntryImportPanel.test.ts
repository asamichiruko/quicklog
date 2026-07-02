import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryImportPanel from "./LogEntryImportPanel.vue"

describe("LogEntryImportPanel", () => {
  it("初期状態でファイルが選択されていない", () => {
    render(LogEntryImportPanel, { props: { importQuicklogDataFromFile: vi.fn() } })

    const importButton = screen.getByRole("button", { name: "ファイルをインポート" })
    expect(importButton).toBeDisabled()

    expect(screen.getByText("選択されていません")).toBeInTheDocument()
  })

  it("ファイルを選択して ファイルをインポート ボタンを押すと import される", async () => {
    const importQuicklogDataFromFile = vi.fn(async () => {
      return { addedCount: 1, deletedCount: 2 }
    })
    const user = userEvent.setup()
    render(LogEntryImportPanel, { props: { importQuicklogDataFromFile } })

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

    expect(importQuicklogDataFromFile).toHaveBeenCalledWith(file)
    expect(screen.getByText(`1 件のメモを追加、2 件のメモを削除しました`)).toBeInTheDocument()
  })

  it("不正なファイルを import しようとするとエラーが表示される", async () => {
    const importQuicklogDataFromFile = vi.fn(async () => {
      throw new SyntaxError()
    })
    const user = userEvent.setup()
    render(LogEntryImportPanel, { props: { importQuicklogDataFromFile } })

    const importButton = screen.getByRole("button", { name: "ファイルをインポート" })
    expect(importButton).toBeDisabled()

    const file = new File(["{ name: invalid json"], "quicklog.json", { type: "application/json" })
    await user.upload(screen.getByLabelText("インポートする JSON ファイル"), file)

    expect(importButton).toBeEnabled()
    expect(screen.getByText("quicklog.json")).toBeInTheDocument()

    await user.click(importButton)

    expect(importQuicklogDataFromFile).toHaveBeenCalledWith(file)
    expect(
      screen.getByText(
        "インポートに失敗しました。ファイル内容が JSON 形式であることを確認してください",
      ),
    ).toBeInTheDocument()
  })
})
