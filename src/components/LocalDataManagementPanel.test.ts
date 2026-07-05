import LocalDataManagementPanel from "@/components/LocalDataManagementPanel.vue"
import userEvent from "@testing-library/user-event"
import { render, screen } from "@testing-library/vue"
import { describe, expect, it, vi } from "vitest"

function getDeleteAnonymousDataConfirmationDetails() {
  const summary = screen.getByText("この端末の匿名データを削除")
  const details = summary.closest("details")
  if (!(details instanceof HTMLDetailsElement)) {
    throw new Error("匿名データ削除の details が見つかりません")
  }

  return details
}

describe("LocalDataManagementPanel", () => {
  it("匿名データの削除確認で 削除する ボタンが押されたら削除を実行する", async () => {
    const user = userEvent.setup()
    const deleteAnonymousData = vi.fn()

    render(LocalDataManagementPanel, {
      props: {
        anonymousDataState: { logEntryCount: 1, logEntryDeletionCount: 0 },
        deleteAnonymousData,
      },
    })

    const details = getDeleteAnonymousDataConfirmationDetails()
    expect(details.open).toBe(false)

    await user.click(screen.getByText("この端末の匿名データを削除"))

    expect(details.open).toBe(true)
    expect(
      screen.getByText(
        /この端末の匿名データを削除します。この操作は元に戻せません。本当に削除しますか？/,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(deleteAnonymousData).toHaveBeenCalled()
    expect(details.open).toBe(false)
  })

  it("匿名データの削除確認で キャンセル ボタンが押されたら確認パネルを閉じる", async () => {
    const user = userEvent.setup()
    const deleteAnonymousData = vi.fn()

    render(LocalDataManagementPanel, {
      props: {
        anonymousDataState: { logEntryCount: 1, logEntryDeletionCount: 0 },
        deleteAnonymousData,
      },
    })

    const details = getDeleteAnonymousDataConfirmationDetails()
    expect(details.open).toBe(false)

    await user.click(screen.getByText("この端末の匿名データを削除"))

    expect(details.open).toBe(true)
    expect(
      screen.getByText(
        /この端末の匿名データを削除します。この操作は元に戻せません。本当に削除しますか？/,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "キャンセル" }))

    expect(deleteAnonymousData).not.toHaveBeenCalled()
    expect(details.open).toBe(false)
  })

  it("匿名データが存在しない場合は削除不能のメッセージを表示する", async () => {
    const user = userEvent.setup()
    const deleteAnonymousData = vi.fn()

    render(LocalDataManagementPanel, {
      props: {
        anonymousDataState: { logEntryCount: 0, logEntryDeletionCount: 0 },
        deleteAnonymousData,
      },
    })

    const details = getDeleteAnonymousDataConfirmationDetails()
    expect(details.open).toBe(false)

    await user.click(screen.getByText("この端末の匿名データを削除"))

    expect(details.open).toBe(true)
    expect(
      screen.getByText(/匿名データが存在しないため、削除操作は行えません。/),
    ).toBeInTheDocument()

    expect(screen.queryByRole("button", { name: "削除する" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "キャンセル" })).not.toBeInTheDocument()
  })
})
