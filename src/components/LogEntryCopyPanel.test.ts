import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryCopyPanel from "./LogEntryCopyPanel.vue"

describe("LogEntryCopyPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
    expect(screen.getByText("クリップボードにコピーしました。")).toBeInTheDocument()
  })
})
