import CloudSyncAccountSignedInView from "@/components/CloudSyncAccountSignedInView.vue"
import userEvent from "@testing-library/user-event"
import { render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

function getDeleteCloudSyncDetails() {
  const summary = screen.getByText("クラウド同期アカウントとデータを削除")
  const details = summary.closest("details")
  if (!(details instanceof HTMLDetailsElement)) {
    throw new Error("クラウド同期アカウント削除の details が見つかりません")
  }

  return details
}

describe("CloudSyncAccountSignedInView", () => {
  it("アカウントの削除確認で 削除する ボタンが押されたら deleteCloudSync を emit する", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountSignedInView, {
      props: {
        isLoading: false,
      },
    })

    const details = getDeleteCloudSyncDetails()
    expect(details.open).toBe(false)

    await user.click(screen.getByText("クラウド同期アカウントとデータを削除"))

    expect(details.open).toBe(true)
    expect(
      screen.getByText(
        "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(emitted("deleteCloudSync")).toHaveLength(1)
  })

  it("アカウントの削除確認で キャンセル ボタンが押されたら確認パネルを閉じる", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountSignedInView, {
      props: {
        isLoading: false,
      },
    })

    const details = getDeleteCloudSyncDetails()
    expect(details.open).toBe(false)

    await user.click(screen.getByText("クラウド同期アカウントとデータを削除"))

    expect(details.open).toBe(true)
    expect(
      screen.getByText(
        "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "キャンセル" }))

    expect(emitted("deleteCloudSync")).toBeUndefined()
    expect(details.open).toBe(false)
  })
})
