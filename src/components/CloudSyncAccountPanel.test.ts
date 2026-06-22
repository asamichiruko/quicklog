import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import type { Session } from "@supabase/supabase-js"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync.ts"
import CloudSyncPanel from "./CloudSyncAccountPanel.vue"
import type { RuntimeSessionState } from "@/types.ts"
import { CloudSyncDeletionError } from "@/errors.ts"

function createSession(userId: string, email: string): Session {
  return {
    user: {
      id: userId,
      email,
    },
  } as unknown as Session
}

function createDefaultProps() {
  const session = null
  const signInWithEmail = vi.fn()
  const signUpWithEmail = vi.fn()
  const signOut = vi.fn()
  const deleteCloudSync = vi.fn()
  const sendPasswordResetCode = vi.fn()
  const verifyPasswordResetCode = vi.fn()
  const changePassword = vi.fn()
  const runtimeSessionState = {
    scope: { type: "anonymous" },
    syncStatus: "disabled",
  } satisfies RuntimeSessionState

  return {
    session,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    deleteCloudSync,
    runtimeSessionState,
    sendPasswordResetCode,
    verifyPasswordResetCode,
    changePassword,
  }
}

vi.mock("@/lib/auth", () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
}))

describe("CloudSyncAccountPanel", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("メールアドレスとパスワードを入力してサインインできる", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps()
    const signInWithEmail = vi.fn()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        signInWithEmail,
      },
    })

    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    expect(signInButton).toBeEnabled()

    await user.click(signInButton)

    expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(await screen.findByText("クラウド同期を開始しました")).toBeInTheDocument()
  })

  it("サインイン時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const signInWithEmail = vi.fn().mockRejectedValue({ code: "invalid_credentials" })
    const defaultProps = createDefaultProps()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        signInWithEmail,
      },
    })

    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signInButton = screen.getByRole("button", { name: "サインイン" })
    expect(signInButton).toBeEnabled()

    await user.click(signInButton)

    expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeInTheDocument()
  })

  it("サインイン中にメールアドレスが表示されてサインアウトできる", async () => {
    const user = userEvent.setup()
    const signOut = vi.fn()
    const defaultProps = createDefaultProps()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        signOut,
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "サインアウト" }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(await screen.findByText("クラウド同期を停止しました")).toBeInTheDocument()
  })

  it("サインアウト時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps()
    const signOut = vi.fn().mockRejectedValue({ code: "request_timeout" })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
        signOut,
      },
    })

    await user.click(screen.getByRole("button", { name: "サインアウト" }))

    expect(
      await screen.findByText("タイムアウトしました。通信状況を確認して再度お試しください"),
    ).toBeInTheDocument()
  })

  it("セッションが失われているとき同期停止メッセージを目立たせる", () => {
    const defaultProps = createDefaultProps()
    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: null,
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "sessionLost",
        },
      },
    })

    expect(screen.getByText(/クラウド同期が停止しています/).closest(".description")).toHaveClass(
      "session-lost",
    )
  })

  it("認証確認中のときは同期停止メッセージとして目立たせない", () => {
    const defaultProps = createDefaultProps()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: null,
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authPending",
        },
      },
    })

    expect(
      screen.getByText("クラウド同期の認証状態を確認しています").closest(".description"),
    ).not.toHaveClass("session-lost")
    expect(screen.queryByText(/クラウド同期が停止しています/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "サインイン" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "アカウントを作成する" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "同期" })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "クラウド同期アカウントとデータを削除" }),
    ).not.toBeInTheDocument()
  })

  it("サインイン中に同期ボタンを押すとクラウド同期を実行する", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps()
    const result = {
      data: {
        version: 3,
        logEntries: [],
        logEntryDeletions: [],
      },
      addedCount: 2,
      deletedCount: 3,
      uploadedCount: 1,
    } satisfies CloudQuicklogDataSyncResult
    const syncLogEntries = vi
      .fn<() => Promise<CloudQuicklogDataSyncResult>>()
      .mockResolvedValue(result)

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
        syncLogEntries,
      },
    })

    await user.click(screen.getByRole("button", { name: "同期" }))

    expect(syncLogEntries).toHaveBeenCalledOnce()
    expect(
      await screen.findByText("同期しました（追加 2 件、削除 3 件、アップロード 1 件）"),
    ).toBeInTheDocument()
  })

  it("同期時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const syncLogEntries = vi
      .fn<() => Promise<CloudQuicklogDataSyncResult>>()
      .mockRejectedValue(new Error("network error"))
    const defaultProps = createDefaultProps()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
        syncLogEntries,
      },
    })

    await user.click(screen.getByRole("button", { name: "同期" }))

    expect(await screen.findByText("同期に失敗しました")).toBeInTheDocument()
  })

  it("アカウント作成時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const signUpWithEmail = vi.fn().mockRejectedValue({ code: "email_exists" })
    const defaultProps = createDefaultProps()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: null,
        signUpWithEmail,
      },
    })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    expect(signUpButton).toBeEnabled()

    await user.click(signUpButton)

    expect(signUpWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(
      await screen.findByText("登録できませんでした。入力内容を確認してください"),
    ).toBeInTheDocument()
  })

  it("メールアドレスとパスワードを入力してアカウントを作成できる", async () => {
    const user = userEvent.setup()
    const signUpWithEmail = vi.fn()
    const defaultProps = createDefaultProps()

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: null,
        signUpWithEmail,
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

  it("アカウントを削除できる", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps()
    const deleteCloudSync = vi.fn().mockResolvedValue(null)

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
        deleteCloudSync,
      },
    })

    await user.click(screen.getByRole("button", { name: "クラウド同期アカウントとデータを削除" }))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(deleteCloudSync).toHaveBeenCalledOnce()
    expect(await screen.findByText("クラウド同期アカウントを削除しました")).toBeInTheDocument()
  })

  it("アカウントの削除に失敗したらエラーを表示する", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps()
    const deleteCloudSync = vi
      .fn()
      .mockRejectedValue(new CloudSyncDeletionError("クラウド同期アカウントを削除できませんでした"))

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
        deleteCloudSync,
      },
    })

    await user.click(screen.getByRole("button", { name: "クラウド同期アカウントとデータを削除" }))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(deleteCloudSync).toHaveBeenCalledOnce()
    expect(
      await screen.findByText("クラウド同期アカウントを削除できませんでした"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "削除する" })).toBeInTheDocument()
  })
})
