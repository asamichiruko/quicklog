import CloudSyncAccountPasswordChangeForm from "@/components/CloudSyncAccountPasswordChangeForm.vue"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountPasswordChangeForm", () => {
  it("新しいパスワードを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountPasswordChangeForm, {
      props: {
        isLoading: false,
      },
    })

    const changeButton = screen.getByRole("button", { name: "パスワードを変更" })
    const newPasswordInput = screen.getByLabelText("新しいパスワード")
    const currentPasswordInput = screen.getByLabelText("現在のパスワード")

    expect(changeButton).toBeDisabled()
    expect(
      screen.queryByText(
        "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください",
      ),
    ).not.toBeInTheDocument()

    await user.type(newPasswordInput, "password")
    await fireEvent.blur(newPasswordInput)
    await user.type(currentPasswordInput, "Passw0rd!")

    expect(changeButton).toBeDisabled()
    expect(
      screen.getByText("パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください"),
    ).toBeInTheDocument()
  })

  it("現在のパスワードを空にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountPasswordChangeForm, {
      props: {
        isLoading: false,
      },
    })

    const changeButton = screen.getByRole("button", { name: "パスワードを変更" })
    const newPasswordInput = screen.getByLabelText("新しいパスワード")
    const currentPasswordInput = screen.getByLabelText("現在のパスワード")

    expect(changeButton).toBeDisabled()
    expect(screen.queryByText("パスワードを入力してください")).not.toBeInTheDocument()

    await user.type(newPasswordInput, "Passw0rd!")
    await fireEvent.blur(newPasswordInput)
    await fireEvent.blur(currentPasswordInput)

    expect(changeButton).toBeDisabled()
    expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument()
  })

  it("二つのパスワードを入力して パスワードを変更 ボタンを押すと submit が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordChangeForm, {
      props: {
        isLoading: false,
      },
    })

    const changeButton = screen.getByRole("button", { name: "パスワードを変更" })
    const newPasswordInput = screen.getByLabelText("新しいパスワード")
    const currentPasswordInput = screen.getByLabelText("現在のパスワード")

    expect(changeButton).toBeDisabled()
    expect(screen.queryByText("パスワードを入力してください")).not.toBeInTheDocument()

    await user.type(newPasswordInput, "Passw0rd!")
    await user.type(currentPasswordInput, "Current42@")

    expect(changeButton).toBeEnabled()

    await user.click(changeButton)

    expect(emitted()).toHaveProperty("submit")
    expect(emitted().submit).toEqual([["Passw0rd!", "Current42@"]])
  })

  it("戻る ボタンを押すと cancel が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordChangeForm, {
      props: {
        isLoading: false,
      },
    })

    const cancelButton = screen.getByRole("button", { name: "戻る" })

    await user.click(cancelButton)

    expect(emitted()).toHaveProperty("cancel")
    expect(emitted().cancel).toEqual([[]])
  })

  it("新しいパスワードを入力すると edit が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordChangeForm, {
      props: {
        isLoading: false,
      },
    })

    await user.type(screen.getByLabelText("新しいパスワード"), "a")

    expect(emitted()).toHaveProperty("edit")
    expect(emitted().edit).toEqual([[]])
  })

  it("現在のパスワードを入力すると edit が emit される", async () => {
    const user = userEvent.setup()

    const { emitted } = render(CloudSyncAccountPasswordChangeForm, {
      props: {
        isLoading: false,
      },
    })

    await user.type(screen.getByLabelText("現在のパスワード"), "a")

    expect(emitted()).toHaveProperty("edit")
    expect(emitted().edit).toEqual([[]])
  })
})
