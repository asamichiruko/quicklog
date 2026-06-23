import CloudSyncAccountPasswordResetForm from "@/components/CloudSyncAccountPasswordResetForm.vue"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountPasswordResetForm", () => {
  it("新しいパスワードを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountPasswordResetForm, {
      props: {
        isLoading: false,
      },
    })

    const resetButton = screen.getByRole("button", { name: "パスワードを設定" })
    const passwordInput = screen.getByLabelText("新しいパスワード")

    expect(resetButton).toBeDisabled()
    expect(
      screen.queryByText(
        "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください",
      ),
    ).not.toBeInTheDocument()

    await user.type(passwordInput, "password")
    await fireEvent.blur(passwordInput)

    expect(resetButton).toBeDisabled()
    expect(
      screen.getByText("パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください"),
    ).toBeInTheDocument()
  })

  it("新しいパスワードを入力して パスワードを設定 ボタンを押すと submit が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordResetForm, {
      props: {
        isLoading: false,
      },
    })

    const resetButton = screen.getByRole("button", { name: "パスワードを設定" })
    const passwordInput = screen.getByLabelText("新しいパスワード")

    expect(resetButton).toBeDisabled()

    await user.type(passwordInput, "Passw0rd!")
    expect(resetButton).toBeEnabled()

    await user.click(resetButton)

    expect(emitted()).toHaveProperty("submit")
    expect(emitted().submit).toEqual([["Passw0rd!"]])
  })

  it("サインインに戻る ボタンを押すと cancel が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordResetForm, {
      props: {
        isLoading: false,
      },
    })

    const cancelButton = screen.getByRole("button", { name: "サインインに戻る" })

    await user.click(cancelButton)

    expect(emitted()).toHaveProperty("cancel")
    expect(emitted().cancel).toEqual([[]])
  })

  it("新しいパスワードを入力すると edit が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordResetForm, {
      props: {
        isLoading: false,
      },
    })

    await user.type(screen.getByLabelText("新しいパスワード"), "a")

    expect(emitted()).toHaveProperty("edit")
    expect(emitted().edit).toEqual([[]])
  })
})
