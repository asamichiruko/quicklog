import CloudSyncAccountSignUpForm from "@/components/CloudSyncAccountSignUpForm.vue"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountSignUpForm", () => {
  it("アカウント作成のメールアドレスを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountSignUpForm, {
      props: {
        isLoading: false,
      },
    })

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    const emailInput = screen.getByLabelText("メールアドレス")

    expect(signUpButton).toBeDisabled()
    expect(
      screen.queryByText("正しい形式のメールアドレスを入力してください"),
    ).not.toBeInTheDocument()

    await user.type(emailInput, "invalid email")
    await fireEvent.blur(emailInput)
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    expect(signUpButton).toBeDisabled()
    expect(screen.getByText("正しい形式のメールアドレスを入力してください")).toBeInTheDocument()
  })

  it("アカウント作成のパスワードを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountSignUpForm, {
      props: {
        isLoading: false,
      },
    })

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    const passwordInput = screen.getByLabelText("パスワード")

    expect(signUpButton).toBeDisabled()
    expect(screen.queryByText("パスワードは 8 文字以上で作成してください")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com")
    await user.type(passwordInput, "Pswd0!")
    await fireEvent.blur(passwordInput)

    expect(signUpButton).toBeDisabled()
    expect(screen.getByText("パスワードは 8 文字以上で作成してください")).toBeInTheDocument()
  })
})
