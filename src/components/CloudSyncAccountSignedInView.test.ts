import CloudSyncAccountSignedInView from "@/components/CloudSyncAccountSignedInView.vue"
import userEvent from "@testing-library/user-event"
import { render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountSignedInView", () => {
  it("アカウントの削除確認でキャンセルできる", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountSignedInView, {
      props: {
        isLoading: false,
      },
    })

    await user.click(screen.getByRole("button", { name: "クラウド同期アカウントとデータを削除" }))
    expect(
      await screen.findByText(
        "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "キャンセル" }))

    expect(
      screen.queryByText(
        "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
      ),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "削除する" })).not.toBeInTheDocument()
  })
})
