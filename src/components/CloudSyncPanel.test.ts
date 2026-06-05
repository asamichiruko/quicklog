import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import type { Session } from "@supabase/supabase-js"
import { signInWithEmail, signOut, signUpWithEmail } from "@/lib/auth"
import type { CloudLogEntrySyncResult } from "@/lib/cloudLogEntrySync"
import CloudSyncPanel from "./CloudSyncPanel.vue"

function createSession(email = "user@example.com"): Session {
  return {
    user: {
      email,
    },
  } as unknown as Session
}

vi.mock("@/lib/auth", () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
}))

describe("CloudSyncPanel", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("メールアドレスとパスワードを入力してサインインできる", async () => {
    const user = userEvent.setup()
    vi.mocked(signInWithEmail).mockResolvedValue()

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    expect(signInButton).toBeEnabled()

    await user.click(signInButton)

    expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(await screen.findByText("サインインしました")).toBeInTheDocument()
  })

  it("サインイン時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    vi.mocked(signInWithEmail).mockRejectedValue({ code: "invalid_credentials" })

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    expect(signInButton).toBeEnabled()

    await user.click(signInButton)

    expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(await screen.findByText("メールアドレスまたはパスワードが正しくありません")).toBeInTheDocument()
  })

  it("サインインのメールアドレスを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    const emailInput = screen.getByLabelText("メールアドレス")

    expect(signInButton).toBeDisabled()
    expect(screen.queryByText("正しい形式のメールアドレスを入力してください")).not.toBeInTheDocument()

    await user.type(emailInput, "invalid email")
    await fireEvent.blur(emailInput)
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    expect(signInButton).toBeDisabled()
    expect(screen.getByText("正しい形式のメールアドレスを入力してください")).toBeInTheDocument()
  })

  it("サインインのパスワードを空にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncPanel, {
      props: {
        session: null,
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

  it("サインイン中にメールアドレスが表示されてサインアウトできる", async () => {
    const user = userEvent.setup()
    vi.mocked(signOut).mockResolvedValue()

    render(CloudSyncPanel, {
      props: {
        session: createSession("user@example.com"),
      },
    })

    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "サインアウト" }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(await screen.findByText("サインアウトしました")).toBeInTheDocument()
  })

  it("サインアウト時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    vi.mocked(signOut).mockRejectedValue({ code: "request_timeout" })

    render(CloudSyncPanel, {
      props: {
        session: createSession("user@example.com"),
      },
    })

    await user.click(screen.getByRole("button", { name: "サインアウト" }))

    expect(await screen.findByText("タイムアウトしました。通信状況を確認して再度お試しください")).toBeInTheDocument()
  })

  it("サインイン中に同期ボタンを押すとクラウド同期を実行する", async () => {
    const user = userEvent.setup()
    const result = {
      data: {
        version: 2,
        logEntries: [],
        syncOperations: [],
      },
      addedCount: 2,
      uploadedCount: 1,
    } satisfies CloudLogEntrySyncResult
    const syncLogEntries = vi.fn<() => Promise<CloudLogEntrySyncResult>>().mockResolvedValue(result)

    render(CloudSyncPanel, {
      props: {
        session: createSession("user@example.com"),
        syncLogEntries,
      },
    })

    await user.click(screen.getByRole("button", { name: "同期" }))

    expect(syncLogEntries).toHaveBeenCalledOnce()
    expect(await screen.findByText("同期しました（追加 2 件、アップロード 1 件）")).toBeInTheDocument()
  })

  it("同期時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const syncLogEntries = vi.fn<() => Promise<CloudLogEntrySyncResult>>().mockRejectedValue(new Error("network error"))

    render(CloudSyncPanel, {
      props: {
        session: createSession("user@example.com"),
        syncLogEntries,
      },
    })

    await user.click(screen.getByRole("button", { name: "同期" }))

    expect(await screen.findByText("同期に失敗しました")).toBeInTheDocument()
  })

  it("アカウント作成時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    vi.mocked(signUpWithEmail).mockRejectedValue({ code: "email_exists" })

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    expect(signUpButton).toBeEnabled()

    await user.click(signUpButton)

    expect(signUpWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(await screen.findByText("登録できませんでした。入力内容を確認してください")).toBeInTheDocument()
  })

  it("メールアドレスとパスワードを入力してアカウントを作成できる", async () => {
    const user = userEvent.setup()
    vi.mocked(signUpWithEmail).mockResolvedValue()

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    expect(signUpButton).toBeEnabled()

    await user.click(signUpButton)

    expect(signUpWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(await screen.findByText("アカウントを作成しました")).toBeInTheDocument()
  })

  it("アカウント作成のメールアドレスを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    const emailInput = screen.getByLabelText("メールアドレス")

    expect(signUpButton).toBeDisabled()
    expect(screen.queryByText("正しい形式のメールアドレスを入力してください")).not.toBeInTheDocument()

    await user.type(emailInput, "invalid email")
    await fireEvent.blur(emailInput)
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    expect(signUpButton).toBeDisabled()
    expect(screen.getByText("正しい形式のメールアドレスを入力してください")).toBeInTheDocument()
  })

  it("アカウント作成のパスワードを不正な値にして離れるとエラーを表示してボタンを無効にする", async () => {
    const user = userEvent.setup()

    render(CloudSyncPanel, {
      props: {
        session: null,
      },
    })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))

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
