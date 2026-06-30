import CloudSyncAccountSignedInView from "@/components/CloudSyncAccountSignedInView.vue"
import userEvent from "@testing-library/user-event"
import { render, screen } from "@testing-library/vue"
import { afterEach, describe, expect, it, vi } from "vitest"

describe("CloudSyncAccountSignedInView", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("アカウントの削除確認で confirm が true を返したときに deleteCloudSync を emit する", async () => {
    const user = userEvent.setup()
    const confirm = vi.fn(() => true)
    vi.stubGlobal("confirm", confirm)

    const { emitted } = render(CloudSyncAccountSignedInView, {
      props: {
        isLoading: false,
      },
    })

    await user.click(screen.getByText("クラウド同期アカウントとデータを削除"))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(confirm).toHaveBeenCalledWith(
      "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
    )
    expect(emitted("deleteCloudSync")).toHaveLength(1)
  })

  it("アカウントの削除確認で confirm が false を返したときは deleteCloudSync を emit しない", async () => {
    const user = userEvent.setup()
    const confirm = vi.fn(() => false)
    vi.stubGlobal("confirm", confirm)

    const { emitted } = render(CloudSyncAccountSignedInView, {
      props: {
        isLoading: false,
      },
    })

    await user.click(screen.getByText("クラウド同期アカウントとデータを削除"))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(confirm).toHaveBeenCalledWith(
      "クラウド同期アカウントとクラウド上の同期データを削除します。この操作は元に戻せません。本当に削除しますか？",
    )
    expect(emitted("deleteCloudSync")).toBeUndefined()
  })
})
