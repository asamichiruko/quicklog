import CloudSyncAccountSignInForm from "@/components/CloudSyncAccountSignInForm.vue"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"

describe("CloudSyncAccountSignInForm", () => {
  it("サインインのメールアドレスを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountSignInForm, {
      props: {
        isLoading: false,
      },
    })

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    const emailInput = screen.getByLabelText("メールアドレス")

    expect(signInButton).toBeDisabled()
    expect(
      screen.queryByText("正しい形式のメールアドレスを入力してください"),
    ).not.toBeInTheDocument()

    await user.type(emailInput, "invalid email")
    await fireEvent.blur(emailInput)
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    expect(signInButton).toBeDisabled()
    expect(screen.getByText("正しい形式のメールアドレスを入力してください")).toBeInTheDocument()
  })

  it("サインインのパスワードを空にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncAccountSignInForm, {
      props: {
        isLoading: false,
      },
    })

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    const passwordInput = screen.getByLabelText("パスワード")

    expect(signInButton).toBeDisabled()
    expect(screen.queryByText("パスワードを入力してください")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com")
    await user.click(passwordInput)
    await fireEvent.blur(passwordInput)

    expect(signInButton).toBeDisabled()
    expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument()
  })
})
