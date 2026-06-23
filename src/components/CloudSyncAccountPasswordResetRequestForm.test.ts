import CloudSyncAccountPasswordResetRequestForm from "@/components/CloudSyncAccountPasswordResetRequestForm.vue"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountPasswordResetRequestForm", () => {
  it("メールアドレスを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()
    render(CloudSyncAccountPasswordResetRequestForm, {
      props: {
        isLoading: false,
      },
    })

    const requestButton = screen.getByRole("button", { name: "パスワードリセット" })
    const emailInput = screen.getByLabelText("メールアドレス")

    expect(requestButton).toBeDisabled()
    expect(
      screen.queryByText("正しい形式のメールアドレスを入力してください"),
    ).not.toBeInTheDocument()

    await user.type(emailInput, "invalid email")
    await fireEvent.blur(emailInput)

    expect(requestButton).toBeDisabled()
    expect(screen.getByText("正しい形式のメールアドレスを入力してください")).toBeInTheDocument()
  })

  it("メールアドレスを入力して パスワードリセット ボタンを押すと submit が emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(CloudSyncAccountPasswordResetRequestForm, {
      props: {
        isLoading: false,
      },
    })

    const requestButton = screen.getByRole("button", { name: "パスワードリセット" })
    const emailInput = screen.getByLabelText("メールアドレス")

    await user.type(emailInput, "user@example.com")

    expect(requestButton).toBeEnabled()

    await user.click(requestButton)

    expect(emitted()).toHaveProperty("submit")
    expect(emitted().submit).toEqual([["user@example.com"]])
  })
})
