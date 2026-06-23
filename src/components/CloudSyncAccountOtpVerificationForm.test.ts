import CloudSyncAccountOtpVerificationForm from "@/components/CloudSyncAccountOtpVerificationForm.vue"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountOtpVerificationForm", () => {
  it("確認コードを空にして離れるとエラーを表示してボタンを無効にする", async () => {
    render(CloudSyncAccountOtpVerificationForm, {
      props: {
        isLoading: false,
      },
    })

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    const verifyInput = screen.getByLabelText("確認コード")

    expect(verifyButton).toBeDisabled()
    expect(screen.queryByText("確認コードを入力してください")).not.toBeInTheDocument()

    await fireEvent.blur(verifyInput)

    expect(verifyButton).toBeDisabled()
    expect(screen.getByText("確認コードを入力してください")).toBeInTheDocument()
  })

  it("確認コードを 6 文字未満にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()
    render(CloudSyncAccountOtpVerificationForm, {
      props: {
        isLoading: false,
      },
    })

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    const verifyInput = screen.getByLabelText("確認コード")

    expect(verifyButton).toBeDisabled()
    expect(screen.queryByText("確認コードは 6 文字で入力してください")).not.toBeInTheDocument()

    await user.type(verifyInput, "12345")
    await fireEvent.blur(verifyInput)

    expect(verifyButton).toBeDisabled()
    expect(screen.getByText("確認コードは 6 文字で入力してください")).toBeInTheDocument()
  })

  it("6 文字の確認コードを入力して 認証する ボタンを押すと submit を emit する", async () => {
    const user = userEvent.setup()
    const { emitted } = render(CloudSyncAccountOtpVerificationForm, {
      props: {
        isLoading: false,
      },
    })

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    const verifyInput = screen.getByLabelText("確認コード")

    await user.type(verifyInput, "123456")
    await user.click(verifyButton)

    expect(emitted()).toHaveProperty("submit")
    expect(emitted().submit).toEqual([["123456"]])
  })

  it("確認メールを再送する ボタンを押すと resend を emit する", async () => {
    const user = userEvent.setup()
    const { emitted } = render(CloudSyncAccountOtpVerificationForm, {
      props: {
        isLoading: false,
      },
    })

    await user.click(screen.getByRole("button", { name: "確認メールを再送する" }))

    expect(emitted()).toHaveProperty("resend")
    expect(emitted().resend).toEqual([[]])
  })

  it("認証をキャンセル ボタンを押すと cancel を emit する", async () => {
    const user = userEvent.setup()
    const { emitted } = render(CloudSyncAccountOtpVerificationForm, {
      props: {
        isLoading: false,
      },
    })

    await user.click(screen.getByRole("button", { name: "認証をキャンセル" }))

    expect(emitted()).toHaveProperty("cancel")
    expect(emitted().cancel).toEqual([[]])
  })

  it("確認コードの入力時に input を emit する", async () => {
    const user = userEvent.setup()
    const { emitted } = render(CloudSyncAccountOtpVerificationForm, {
      props: {
        isLoading: false,
      },
    })

    const verifyInput = screen.getByLabelText("確認コード")
    await user.type(verifyInput, "1")

    expect(emitted()).toHaveProperty("edit")
    expect(emitted().edit).toEqual([[]])
  })
})
