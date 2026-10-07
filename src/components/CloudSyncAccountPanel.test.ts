import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import type { Session, User } from "@supabase/supabase-js"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync.ts"
import CloudSyncPanel, { type CloudSyncAccountActions } from "./CloudSyncAccountPanel.vue"
import type { RuntimeSessionState } from "@/types.ts"
import { CloudSyncDeletionError } from "@/errors.ts"
import type { AccountUserView } from "@/composables/useAccountUser.ts"
import { nextTick, readonly, ref } from "vue"

function createSession(userId: string, email: string): Session {
  return {
    user: {
      id: userId,
      email,
    },
  } as unknown as Session
}

function createActions() {
  const actions = {
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
    deleteCloudSync: vi.fn(),
    sendPasswordResetCode: vi.fn(),
    verifyPasswordResetCode: vi.fn(),
    updatePasswordAfterRecovery: vi.fn(),
    changePassword: vi.fn(),
    verifySignUpCode: vi.fn(),
    resendSignUpCode: vi.fn(),
    cancelPasswordRecovery: vi.fn(),
    requestEmailChange: vi.fn(),
    resendEmailChangeConfirmation: vi.fn(),
  } satisfies CloudSyncAccountActions

  return actions
}

function createAccountUser(
  options: {
    isLoading?: boolean
    error?: unknown
    user?: User | null
    refresh?: () => Promise<void>
  } = {},
) {
  return {
    isLoading: readonly(ref(options.isLoading ?? false)),
    error: readonly(ref<unknown>(options.error ?? null)),
    user: readonly(ref<User | null>(options.user ?? null)),
    refresh: options.refresh ?? vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } satisfies AccountUserView
}

function createDefaultProps(actions: CloudSyncAccountActions) {
  const session = null
  const accountUser = createAccountUser({
    isLoading: false,
    error: null,
    user: null,
    refresh: vi.fn(),
  })
  const runtimeSessionState = {
    scope: { type: "anonymous" },
    syncStatus: "disabled",
  } satisfies RuntimeSessionState

  return {
    session,
    accountUser,
    runtimeSessionState,
    actions,
  }
}

vi.mock("@/lib/auth", () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetCode: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  updatePasswordAfterRecovery: vi.fn(),
  changePassword: vi.fn(),
}))

describe("CloudSyncAccountPanel", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe("メールアドレス変更の画面遷移", () => {
    function renderEmailChangePanel(
      currentEmail = "old@example.com",
      accountUser = createAccountUser({ user: { id: "user1", email: currentEmail } as User }),
    ) {
      const actions = createActions()
      const view = render(CloudSyncPanel, {
        props: {
          ...createDefaultProps(actions),
          session: createSession("user1", currentEmail),
          accountUser,
          runtimeSessionState: {
            scope: { type: "user", userId: "user1" },
            syncStatus: "authenticated",
          },
        },
      })
      return Object.assign(actions, { rerender: view.rerender })
    }

    async function submitEmailChange(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "メールアドレスを変更" }))
      await user.type(screen.getByLabelText("新しいメールアドレス"), "new@example.com")
      await user.click(screen.getByRole("button", { name: "確認メールを送信" }))
    }

    it("送信成功後に送信先を表示し、修正時に入力を復元する", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      await submitEmailChange(user)

      expect(actions.requestEmailChange).toHaveBeenCalledExactlyOnceWith("new@example.com")
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      expect(screen.getByText("old@example.com", { exact: true })).toBeInTheDocument()
      expect(screen.getByText("new@example.com", { exact: true })).toBeInTheDocument()
      expect(screen.queryByLabelText("新しいメールアドレス")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "新しいメールアドレスを修正" }))
      expect(screen.getByLabelText("新しいメールアドレス")).toHaveValue("new@example.com")
      expect(
        screen.queryByText("メールアドレス変更用のメールを送信しました"),
      ).not.toBeInTheDocument()
    })

    it("確認待ちからアカウント画面に戻り、再度開くと入力は空になる", async () => {
      const user = userEvent.setup()
      renderEmailChangePanel()
      await submitEmailChange(user)

      await user.click(screen.getByRole("button", { name: "アカウント画面に戻る" }))
      expect(screen.getByRole("button", { name: "サインアウト" })).toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "メールアドレスを変更" }))
      expect(screen.getByLabelText("新しいメールアドレス")).toHaveValue("")
    })

    it("送信失敗時は入力を保持して変更フォームに留まる", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      actions.requestEmailChange.mockRejectedValueOnce(null)
      await submitEmailChange(user)

      expect(screen.getByLabelText("新しいメールアドレス")).toHaveValue("new@example.com")
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByText("認証処理に失敗しました。時間をおいて再度お試しください"),
      ).toBeInTheDocument()
    })

    function changedUserProps(userId: string) {
      return {
        session: createSession(userId, `${userId}@example.com`),
        accountUser: createAccountUser({
          user: { id: userId, email: `${userId}@example.com` } as User,
        }),
        runtimeSessionState: {
          scope: { type: "user", userId },
          syncStatus: "authenticated",
        } satisfies RuntimeSessionState,
      }
    }

    it("確認待ち中のユーザー変更で申請情報を消し、元のユーザーに戻っても復元しない", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      await submitEmailChange(user)
      await actions.rerender(changedUserProps("user2"))
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
      await actions.rerender(changedUserProps("user1"))
      await user.click(screen.getByRole("button", { name: "メールアドレスを変更" }))
      expect(screen.getByLabelText("新しいメールアドレス")).toHaveValue("")
    })

    it("確認待ち中のサインアウトで申請情報を消す", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      await submitEmailChange(user)
      await actions.rerender({
        session: null,
        runtimeSessionState: { scope: { type: "anonymous" }, syncStatus: "disabled" },
      })
      expect(screen.getByRole("heading", { name: "サインイン" })).toBeInTheDocument()
      await actions.rerender(changedUserProps("user1"))
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
    })

    it("同じユーザーのセッション更新では確認待ちを保持する", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      await submitEmailChange(user)
      await actions.rerender(changedUserProps("user1"))
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      expect(screen.getByText("old@example.com", { exact: true })).toBeInTheDocument()
    })

    it.each(["success", "error"] as const)(
      "ユーザー変更後の古い送信応答（%s）を反映しない",
      async (result) => {
        const user = userEvent.setup()
        const actions = renderEmailChangePanel()
        let resolveRequest!: () => void
        let rejectRequest!: (error: unknown) => void
        actions.requestEmailChange.mockImplementationOnce(
          () =>
            new Promise<void>((resolve, reject) => {
              resolveRequest = resolve
              rejectRequest = reject
            }),
        )
        await submitEmailChange(user)
        await actions.rerender(changedUserProps("user2"))
        if (result === "success") resolveRequest()
        else rejectRequest(null)
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "サインアウト" })).toBeEnabled(),
        )
        expect(
          screen.queryByRole("heading", { name: "確認メールを送信しました" }),
        ).not.toBeInTheDocument()
        expect(screen.queryByRole("status")).not.toBeInTheDocument()
      },
    )

    it("再送では保持した変更先を使用し、確認待ち画面を維持する", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "確認メールを再送" }))

      expect(actions.resendEmailChangeConfirmation).toHaveBeenCalledExactlyOnceWith(
        "new@example.com",
      )
      expect(actions.requestEmailChange).toHaveBeenCalledTimes(1)
      expect(screen.getByText("メールアドレス変更用のメールを再送しました")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
    })

    it("再送失敗時も確認待ち画面に留まり、再試行できる", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel()
      await submitEmailChange(user)
      actions.resendEmailChangeConfirmation.mockRejectedValueOnce(null)
      await user.click(screen.getByRole("button", { name: "確認メールを再送" }))

      expect(
        screen.getByText("認証処理に失敗しました。時間をおいて再度お試しください"),
      ).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "確認メールを再送" }))
      expect(actions.resendEmailChangeConfirmation).toHaveBeenCalledTimes(2)
      expect(screen.getByText("メールアドレス変更用のメールを再送しました")).toBeInTheDocument()
    })

    it("現在のメールアドレスが不正な場合は送信せず、入力画面で案内する", async () => {
      const user = userEvent.setup()
      const actions = renderEmailChangePanel("invalid-email")
      await submitEmailChange(user)

      expect(actions.requestEmailChange).not.toHaveBeenCalled()
      expect(screen.getByLabelText("新しいメールアドレス")).toHaveValue("new@example.com")
      expect(
        screen.getByText(
          "現在のメールアドレスを確認できません。アカウント情報を再取得してください",
        ),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
    })

    it("確認待ち状態でメールアドレスが変更先のものになったら自動的に完了する", async () => {
      const accountUserRef = ref<User | null>({
        id: "user1",
        email: "old@example.com",
      } as User)

      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        accountUserRef.value = {
          id: "user1",
          email: "new@example.com",
        } as User
      })

      const accountUser = {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      } satisfies AccountUserView

      const user = userEvent.setup()
      renderEmailChangePanel("old@example.com", accountUser)

      await submitEmailChange(user)
      await refresh()

      expect(refresh).toHaveBeenCalledOnce()
      expect(await screen.findByText("メールアドレスの変更が完了しました")).toBeInTheDocument()

      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "サインアウト" })).toBeInTheDocument()
    })

    it("確認待ち状態でメールアドレス取得中の場合は自動的に完了しない", async () => {
      const user = userEvent.setup()
      const loading = ref(false)
      const accountUserRef = ref<User | null>({
        id: "user1",
        email: "old@example.com",
      } as User)

      let finish!: () => void
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(() => {
        loading.value = true
        accountUserRef.value = {
          id: "user1",
          email: "new@example.com",
        } as User

        return new Promise<void>((resolve) => {
          finish = () => {
            loading.value = false
            resolve()
          }
        })
      })
      const accountUser = {
        ...createAccountUser({ user: { id: "user1", email: "old@example.com" } as User }),
        isLoading: readonly(loading),
        user: readonly(accountUserRef),
        refresh,
      }
      renderEmailChangePanel("old@example.com", accountUser)

      await submitEmailChange(user)
      refresh()
      await nextTick()

      for (const name of [
        "変更状況を確認",
        "確認メールを再送",
        "新しいメールアドレスを修正",
        "アカウント画面に戻る",
      ]) {
        expect(screen.getByRole("button", { name })).toBeDisabled()
      }
      finish()

      expect(await screen.findByText("メールアドレスの変更が完了しました")).toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "サインアウト" })).toBeInTheDocument()
    })

    it("確認待ち状態でメールアドレスの取得に失敗している場合は自動的に完了しない", async () => {
      const errorRef = ref<unknown>(null)
      const accountUserRef = ref<User | null>({
        id: "user1",
        email: "old@example.com",
      } as User)

      const refresh = vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          errorRef.value = new Error("refresh failed")
          accountUserRef.value = {
            id: "user1",
            email: "new@example.com",
          } as User
        })
        .mockImplementationOnce(async () => {
          errorRef.value = null
        })

      const accountUser = {
        ...createAccountUser({
          user: {
            id: "user1",
            email: "old@example.com",
          } as User,
        }),
        error: readonly(errorRef),
        user: readonly(accountUserRef),
        refresh,
      } satisfies AccountUserView

      const user = userEvent.setup()
      renderEmailChangePanel("old@example.com", accountUser)

      await submitEmailChange(user)
      await refresh()

      expect(refresh).toHaveBeenCalledOnce()
      expect(
        screen.queryByText("認証処理に失敗しました。時間をおいて再度お試しください"),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()

      await refresh()

      expect(refresh).toHaveBeenCalledTimes(2)
      expect(screen.getByText("メールアドレスの変更が完了しました")).toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "サインアウト" })).toBeInTheDocument()
    })

    it("確認待ち状態のユーザーと現在のユーザーが異なる場合は自動的に完了しない", async () => {
      const user = userEvent.setup()
      const accountUserRef = ref<User | null>({ id: "user1", email: "old@example.com" } as User)
      let finish!: () => void
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = () => {
              accountUserRef.value = { id: "user1", email: "new@example.com" } as User
              resolve()
            }
          }),
      )
      const actions = renderEmailChangePanel("old@example.com", {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      })

      await submitEmailChange(user)
      refresh()
      await actions.rerender({
        session: createSession("user2", "user2@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user2" },
          syncStatus: "authenticated",
        } satisfies RuntimeSessionState,
      })
      finish()

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "サインアウト" })).toBeEnabled(),
      )
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
    })

    it("認証ユーザーが同じでも別ユーザーの取得メールが変更先と一致した場合は自動完了しない", async () => {
      const user = userEvent.setup()
      const accountUserRef = ref<User | null>({
        id: "user1",
        email: "old@example.com",
      } as User)
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        accountUserRef.value = {
          id: "user2",
          email: "new@example.com",
        } as User
      })
      renderEmailChangePanel("old@example.com", {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      })

      await submitEmailChange(user)
      await refresh()
      await nextTick()

      expect(screen.queryByText("メールアドレスの変更が完了しました")).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "変更状況を確認" })).toBeEnabled()
    })

    it("変更状況の確認で未反映状態を確認できる", async () => {
      const user = userEvent.setup()
      renderEmailChangePanel()
      await submitEmailChange(user)

      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          "メールアドレスの変更はまだ反映されていません。各メールアドレス宛の確認メールのリンクを開いてください",
        ),
      ).toBeInTheDocument()
    })

    it("変更状況の確認で反映されていた場合はアカウント画面に戻る", async () => {
      const accountUserRef = ref<User | null>({
        id: "user1",
        email: "old@example.com",
      } as User)

      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        accountUserRef.value = {
          id: "user1",
          email: "new@example.com",
        } as User
      })

      const accountUser = {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      } satisfies AccountUserView

      const user = userEvent.setup()
      renderEmailChangePanel("old@example.com", accountUser)

      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))

      expect(refresh).toHaveBeenCalledOnce()
      expect(await screen.findByText("メールアドレスの変更が完了しました")).toBeInTheDocument()

      expect(screen.getByRole("button", { name: "サインアウト" })).toBeInTheDocument()
    })

    it("変更状況の確認でアカウント情報の取得に失敗した場合はエラーが表示され、その後再試行できる", async () => {
      const errorRef = ref<unknown>(null)
      const refresh = vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          errorRef.value = new Error("refresh failed")
        })
        .mockImplementationOnce(async () => {
          errorRef.value = null
        })

      const accountUser = {
        ...createAccountUser({
          user: {
            id: "user1",
            email: "old@example.com",
          } as User,
        }),
        error: readonly(errorRef),
        refresh,
      } satisfies AccountUserView

      const user = userEvent.setup()
      renderEmailChangePanel("old@example.com", accountUser)

      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))

      expect(refresh).toHaveBeenCalledOnce()
      expect(
        await screen.findByText("認証処理に失敗しました。時間をおいて再度お試しください"),
      ).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))

      expect(refresh).toHaveBeenCalledTimes(2)
      expect(
        screen.getByText(
          "メールアドレスの変更はまだ反映されていません。各メールアドレス宛の確認メールのリンクを開いてください",
        ),
      ).toBeInTheDocument()
    })

    it.each(["old@example.com", " old@example.com "])(
      "現在と同じアドレス（%s）は送信できない",
      async (email) => {
        const user = userEvent.setup()
        const actions = renderEmailChangePanel()
        await user.click(screen.getByRole("button", { name: "メールアドレスを変更" }))
        await user.type(screen.getByLabelText("新しいメールアドレス"), email)
        await user.tab()
        expect(screen.getByRole("button", { name: "確認メールを送信" })).toBeDisabled()
        expect(
          screen.getByText("現在のものと異なるメールアドレスを入力してください"),
        ).toBeInTheDocument()
        expect(actions.requestEmailChange).not.toHaveBeenCalled()
      },
    )

    it("変更状況の取得中は操作を無効にし、取得後に再度操作できる", async () => {
      const user = userEvent.setup()
      const loading = ref(false)
      let finish!: () => void
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(() => {
        loading.value = true
        return new Promise<void>((resolve) => {
          finish = () => {
            loading.value = false
            resolve()
          }
        })
      })
      const accountUser = {
        ...createAccountUser({ user: { id: "user1", email: "old@example.com" } as User }),
        isLoading: readonly(loading),
        refresh,
      }
      renderEmailChangePanel("old@example.com", accountUser)
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      for (const name of [
        "変更状況を確認",
        "確認メールを再送",
        "新しいメールアドレスを修正",
        "アカウント画面に戻る",
      ]) {
        expect(screen.getByRole("button", { name })).toBeDisabled()
      }
      finish()
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "変更状況を確認" })).toBeEnabled(),
      )
    })

    it("変更状況の取得中に認証ユーザーが変わると古い応答を無視する", async () => {
      const user = userEvent.setup()
      const accountUserRef = ref<User | null>({ id: "user1", email: "old@example.com" } as User)
      let finish!: () => void
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = () => {
              accountUserRef.value = { id: "user1", email: "new@example.com" } as User
              resolve()
            }
          }),
      )
      const actions = renderEmailChangePanel("old@example.com", {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      })
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      await actions.rerender(changedUserProps("user2"))
      finish()
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "サインアウト" })).toBeEnabled(),
      )
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { name: "確認メールを送信しました" }),
      ).not.toBeInTheDocument()
    })

    it("変更状況の確認中に別の自動取得が始まった場合、確認前の情報で結果を表示しない", async () => {
      const user = userEvent.setup()
      const loading = ref(false)
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        loading.value = true
      })
      renderEmailChangePanel("old@example.com", {
        ...createAccountUser({ user: { id: "user1", email: "old@example.com" } as User }),
        isLoading: readonly(loading),
        refresh,
      })
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      expect(screen.queryByText(/メールアドレスの変更はまだ反映/)).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
    })

    it("取得ユーザーがない場合は確認できない旨を表示して確認待ちを維持する", async () => {
      const user = userEvent.setup()
      const accountUserRef = ref<User | null>({ id: "user1", email: "old@example.com" } as User)
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        accountUserRef.value = null
      })
      renderEmailChangePanel("old@example.com", {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      })
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      expect(screen.queryByText("メールアドレスの変更が完了しました")).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      expect(
        screen.getByText("現在のメールアドレスを確認できません。アカウント情報を確認してください"),
      ).toBeInTheDocument()
    })

    it("取得ユーザーのメールアドレスがない場合は確認できない旨を表示して確認待ちを維持する", async () => {
      const user = userEvent.setup()
      const accountUserRef = ref<User | null>({ id: "user1", email: "old@example.com" } as User)
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        accountUserRef.value = { id: "user1" } as User
      })
      renderEmailChangePanel("old@example.com", {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      })
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      expect(screen.queryByText("メールアドレスの変更が完了しました")).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      expect(
        screen.getByText("現在のメールアドレスを確認できません。アカウント情報を確認してください"),
      ).toBeInTheDocument()
    })

    it("別ユーザーの取得情報では完了と判定せず確認待ちを維持する", async () => {
      const user = userEvent.setup()
      const accountUserRef = ref<User | null>({ id: "user1", email: "old@example.com" } as User)
      const refresh = vi.fn<() => Promise<void>>().mockImplementation(async () => {
        accountUserRef.value = { id: "user2", email: "new@example.com" } as User
      })
      renderEmailChangePanel("old@example.com", {
        ...createAccountUser(),
        user: readonly(accountUserRef),
        refresh,
      })
      await submitEmailChange(user)
      await user.click(screen.getByRole("button", { name: "変更状況を確認" }))
      expect(screen.queryByText("メールアドレスの変更が完了しました")).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "確認メールを送信しました" })).toBeInTheDocument()
      expect(
        screen.queryByText(
          "現在のメールアドレスを確認できません。アカウント情報を確認してください",
        ),
      ).not.toBeInTheDocument()
    })
  })

  it("メールアドレスとパスワードを入力してサインインできる", async () => {
    const user = userEvent.setup()
    const signInWithEmail = vi.fn()
    const defaultProps = createDefaultProps({
      ...createActions(),
      signInWithEmail,
    })

    render(CloudSyncPanel, { props: defaultProps })

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
    const defaultProps = createDefaultProps({
      ...createActions(),
      signInWithEmail,
    })

    render(CloudSyncPanel, { props: defaultProps })

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

  it("サインイン中にサインアウトできる", async () => {
    const user = userEvent.setup()
    const signOut = vi.fn()
    const defaultProps = createDefaultProps({
      ...createActions(),
      signOut,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "サインアウト" }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(await screen.findByText("クラウド同期を停止しました")).toBeInTheDocument()
  })

  describe("アカウント情報の表示と再取得", () => {
    // 認証状態は固定し、各テストでは表示用の情報と取得状況を指定する。
    function renderAccountUser(options: Parameters<typeof createAccountUser>[0] = {}) {
      return render(CloudSyncPanel, {
        props: {
          ...createDefaultProps(createActions()),
          session: createSession("user1", "session@example.com"),
          accountUser: createAccountUser(options),
          runtimeSessionState: {
            scope: { type: "user", userId: "user1" },
            syncStatus: "authenticated",
          },
        },
      })
    }

    const account = createSession("user1", "user@example.com").user

    describe("通常時", () => {
      it("未取得: 案内と取得ボタンを表示し、メール未登録とは表示しない", () => {
        renderAccountUser()

        expect(screen.getByText("アカウント情報を確認できていません")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "取得" })).toBeEnabled()
        expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument()
        expect(screen.queryByText(/サインイン中:/)).not.toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を取得しています…")).not.toBeInTheDocument()
      })

      it("取得済み: セッション内のメールではなく、取得したメールアドレスを表示する", () => {
        renderAccountUser({ user: account })

        expect(screen.getByText("サインイン中: user@example.com")).toBeInTheDocument()
        expect(screen.queryByText(/session@example\.com/)).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "取得" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を取得しています…")).not.toBeInTheDocument()
      })

      it("メール未登録: 未登録と表示し、メール変更の導線を出さない", () => {
        renderAccountUser({ user: { ...account, email: undefined } })

        expect(screen.getByText("サインイン中: メールアドレス登録なし")).toBeInTheDocument()
        expect(screen.queryByText(/session@example\.com/)).not.toBeInTheDocument()
        expect(
          screen.queryByRole("button", { name: "メールアドレスを変更" }),
        ).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "取得" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument()
      })
    })

    describe("取得中", () => {
      it("取得済み情報なし: 取得中の案内を表示し、未取得の案内と操作ボタンは表示しない", () => {
        renderAccountUser({ isLoading: true })

        expect(screen.getByText("アカウント情報を取得しています…")).toBeInTheDocument()
        expect(screen.queryByText(/サインイン中:/)).not.toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を確認できていません")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "取得" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument()
      })

      it("取得済み情報あり: メールアドレスと取得中の案内を併記する", () => {
        renderAccountUser({ user: account, isLoading: true })

        expect(screen.getByText("サインイン中: user@example.com")).toBeInTheDocument()
        expect(screen.getByText("アカウント情報を取得しています…")).toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を確認できていません")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "取得" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument()
      })
    })

    describe("取得失敗", () => {
      it("取得済み情報なし: 失敗の案内と再試行ボタンを表示する", () => {
        renderAccountUser({ error: new Error("network unavailable") })

        expect(screen.getByText("アカウント情報を取得できませんでした")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "再試行" })).toBeEnabled()
        expect(screen.queryByRole("button", { name: "取得" })).not.toBeInTheDocument()
        expect(screen.queryByText(/サインイン中:/)).not.toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を確認できていません")).not.toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を取得しています…")).not.toBeInTheDocument()
        expect(
          screen.queryByText("クラウド同期を使うにはサインインしてください"),
        ).not.toBeInTheDocument()
      })

      it("取得済み情報あり: メールアドレスと更新失敗の案内を併記し、再試行できる", () => {
        renderAccountUser({ user: account, error: new Error("network unavailable") })

        expect(screen.getByText("サインイン中: user@example.com")).toBeInTheDocument()
        expect(screen.getByText("最新のアカウント情報を取得できませんでした")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "再試行" })).toBeEnabled()
        expect(screen.queryByRole("button", { name: "取得" })).not.toBeInTheDocument()
        expect(screen.queryByText("アカウント情報を取得しています…")).not.toBeInTheDocument()
      })
    })

    describe("ボタン操作", () => {
      it.each([
        { buttonLabel: "取得", error: null },
        { buttonLabel: "再試行", error: new Error("network unavailable") },
      ])("$buttonLabel ボタンを押すと refresh を呼ぶ", async ({ buttonLabel, error }) => {
        const user = userEvent.setup()
        const refresh = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
        renderAccountUser({ error, refresh })

        expect(refresh).not.toHaveBeenCalled()

        await user.click(screen.getByRole("button", { name: buttonLabel }))

        expect(refresh).toHaveBeenCalledExactlyOnceWith()
      })
    })
  })

  it("サインアウト時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const signOut = vi.fn().mockRejectedValue({ code: "request_timeout" })
    const defaultProps = createDefaultProps({
      ...createActions(),
      signOut,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "サインアウト" }))

    expect(
      await screen.findByText("タイムアウトしました。通信状況を確認して再度お試しください"),
    ).toBeInTheDocument()
  })

  it("セッションが失われているとき同期停止メッセージを目立たせる", () => {
    const defaultProps = createDefaultProps(createActions())
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

    expect(screen.getByText(/クラウド同期が停止しています/).closest(".sync-state")).toHaveClass(
      "session-lost",
    )
  })

  it("認証確認中のときは同期停止メッセージとして目立たせない", () => {
    const defaultProps = createDefaultProps(createActions())

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

    const defaultProps = createDefaultProps({
      ...createActions(),
      syncLogEntries,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "いますぐ同期" }))

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

    const defaultProps = createDefaultProps({
      ...createActions(),
      syncLogEntries,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "いますぐ同期" }))

    expect(
      await screen.findByText("認証処理に失敗しました。時間をおいて再度お試しください"),
    ).toBeInTheDocument()
  })

  it("サインイン中に パスワードを変更 ボタンを押すと ChangePasswordForm に遷移する", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps(createActions())

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "パスワードを変更" }))

    expect(screen.getByRole("heading", { name: "パスワードの変更" })).toBeInTheDocument()
  })

  it("パスワードの変更に成功すると changePassword が呼ばれてクラウド同期画面に遷移する", async () => {
    const user = userEvent.setup()
    const defaultProps = createDefaultProps(createActions())

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "パスワードを変更" }))

    expect(screen.getByRole("heading", { name: "パスワードの変更" })).toBeInTheDocument()

    await user.type(screen.getByLabelText("新しいパスワード"), "Passw0rd!")
    await user.type(screen.getByLabelText("現在のパスワード"), "Current42@")
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }))

    expect(screen.getByRole("heading", { name: "クラウド同期" })).toBeInTheDocument()
  })

  it("パスワードの変更に失敗すると画面を遷移しない", async () => {
    const user = userEvent.setup()
    const error = new Error("パスワード変更エラー")
    const changePassword = vi.fn().mockRejectedValue(error)
    const defaultProps = createDefaultProps({
      ...createActions(),
      changePassword,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByRole("button", { name: "パスワードを変更" }))

    expect(screen.getByRole("heading", { name: "パスワードの変更" })).toBeInTheDocument()

    await user.type(screen.getByLabelText("新しいパスワード"), "Passw0rd!")
    await user.type(screen.getByLabelText("現在のパスワード"), "Current42@")

    await user.click(screen.getByRole("button", { name: "パスワードを変更" }))

    expect(
      screen.getByText("認証処理に失敗しました。時間をおいて再度お試しください"),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "パスワードの変更" })).toBeInTheDocument()
  })

  it("アカウント作成時にエラーが発生するとその旨が表示される", async () => {
    const user = userEvent.setup()
    const signUpWithEmail = vi.fn().mockRejectedValue({ code: "email_exists" })
    const defaultProps = createDefaultProps({
      ...createActions(),
      signUpWithEmail,
    })

    render(CloudSyncPanel, { props: defaultProps })

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
    const verifySignUpCode = vi.fn()
    const defaultProps = createDefaultProps({
      ...createActions(),
      signUpWithEmail,
      verifySignUpCode,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    expect(signUpButton).toBeEnabled()

    await user.click(signUpButton)

    expect(signUpWithEmail).toHaveBeenCalledWith("user@example.com", "Passw0rd!")
    expect(screen.getByText("確認メールを送信しました")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "戻る" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("確認コード"), "123456")

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    expect(verifyButton).toBeEnabled()

    await user.click(verifyButton)

    expect(verifySignUpCode).toHaveBeenCalledWith("user@example.com", "123456")
    expect(screen.getByText("認証に成功しました")).toBeInTheDocument()
  })

  it("アカウント作成時のメールアドレス認証に失敗してもリトライできる", async () => {
    const user = userEvent.setup()
    const error = new Error("認証エラー")
    const verifySignUpCode = vi.fn().mockRejectedValueOnce(error)
    const defaultProps = createDefaultProps({
      ...createActions(),
      verifySignUpCode,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    expect(signUpButton).toBeEnabled()

    await user.click(signUpButton)

    expect(screen.getByText("確認メールを送信しました")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()

    const codeInput = screen.getByLabelText("確認コード")
    await user.type(codeInput, "123456")

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    expect(verifyButton).toBeEnabled()

    await user.click(verifyButton)

    expect(
      screen.getByText("認証処理に失敗しました。時間をおいて再度お試しください"),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()
    expect(codeInput).toHaveValue("")

    await user.type(codeInput, "654321")
    await user.click(verifyButton)

    expect(screen.getByText("認証に成功しました")).toBeInTheDocument()
    expect(verifySignUpCode).toHaveBeenLastCalledWith("user@example.com", "654321")
  })

  it("アカウント作成で認証コードを再送できる", async () => {
    const user = userEvent.setup()
    const resendSignUpCode = vi.fn()
    const defaultProps = createDefaultProps({
      ...createActions(),
      resendSignUpCode,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")

    const signUpButton = screen.getByRole("button", { name: "アカウントを作成" })
    expect(signUpButton).toBeEnabled()

    await user.click(signUpButton)

    expect(screen.getByText("確認メールを送信しました")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()

    const resendButton = screen.getByRole("button", { name: "確認メールを再送する" })
    await user.click(resendButton)

    expect(resendSignUpCode).toHaveBeenCalledWith("user@example.com")
    expect(screen.getByText("アカウント作成用のメールを再送しました")).toBeInTheDocument()
  })

  it("アカウント作成をキャンセルすると state が破棄される", async () => {
    const user = userEvent.setup()
    const signUpWithEmail = vi.fn()
    const verifySignUpCode = vi.fn()
    const defaultProps = createDefaultProps({
      ...createActions(),
      signUpWithEmail,
      verifySignUpCode,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), " first@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "First123!")
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }))

    expect(signUpWithEmail).toHaveBeenCalledWith("first@example.com", "First123!")
    expect(screen.getByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "認証をキャンセル" }))

    expect(screen.getByRole("heading", { name: "アカウント作成" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "メールアドレスの確認" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("メールアドレス"), " second@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Second123!")
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }))

    expect(signUpWithEmail).toHaveBeenLastCalledWith("second@example.com", "Second123!")

    await user.type(screen.getByLabelText("確認コード"), "123456")
    await user.click(screen.getByRole("button", { name: "認証する" }))

    expect(verifySignUpCode).toHaveBeenCalledExactlyOnceWith("second@example.com", "123456")
  })

  it("アカウントを削除できる", async () => {
    const user = userEvent.setup()
    const deleteCloudSync = vi.fn().mockResolvedValue(null)
    const confirm = vi.fn(() => true)
    vi.stubGlobal("confirm", confirm)
    const defaultProps = createDefaultProps({
      ...createActions(),
      deleteCloudSync,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByText("クラウド同期アカウントとデータを削除"))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(deleteCloudSync).toHaveBeenCalledOnce()
    expect(await screen.findByText("クラウド同期アカウントを削除しました")).toBeInTheDocument()
  })

  it("アカウントの削除に失敗したらエラーを表示する", async () => {
    const user = userEvent.setup()
    const deleteCloudSync = vi
      .fn()
      .mockRejectedValue(new CloudSyncDeletionError("クラウド同期アカウントを削除できませんでした"))
    const confirm = vi.fn(() => true)
    vi.stubGlobal("confirm", confirm)
    const defaultProps = createDefaultProps({
      ...createActions(),
      deleteCloudSync,
    })

    render(CloudSyncPanel, {
      props: {
        ...defaultProps,
        session: createSession("user1", "user@example.com"),
        runtimeSessionState: {
          scope: { type: "user", userId: "user1" },
          syncStatus: "authenticated",
        },
      },
    })

    await user.click(screen.getByText("クラウド同期アカウントとデータを削除"))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    expect(deleteCloudSync).toHaveBeenCalledOnce()
    expect(
      await screen.findByText("クラウド同期アカウントを削除できませんでした"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "削除する" })).toBeInTheDocument()
  })

  it("OTP を利用してパスワードを再設定できる", async () => {
    const user = userEvent.setup()
    const sendPasswordResetCode = vi.fn().mockResolvedValue(null)
    const verifyPasswordResetCode = vi.fn().mockResolvedValue(null)
    const updatePasswordAfterRecovery = vi.fn().mockResolvedValue(null)
    const defaultProps = createDefaultProps({
      ...createActions(),
      sendPasswordResetCode,
      verifyPasswordResetCode,
      updatePasswordAfterRecovery,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")

    const requestButton = screen.getByRole("button", { name: "パスワードリセット" })
    expect(requestButton).toBeEnabled()

    await user.click(requestButton)

    expect(sendPasswordResetCode).toHaveBeenCalledWith("user@example.com")
    expect(
      await screen.findByText("パスワードリセット用のメールを送信しました"),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "戻る" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("確認コード"), "123456")

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    expect(verifyButton).toBeEnabled()

    await user.click(verifyButton)

    expect(verifyPasswordResetCode).toHaveBeenCalledWith("user@example.com", "123456")
    expect(await screen.findByText("認証に成功しました")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "戻る" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("新しいパスワード"), "Passw0rd!")

    const passwordResetButton = screen.getByRole("button", { name: "パスワードを設定" })
    expect(passwordResetButton).toBeEnabled()

    await user.click(passwordResetButton)

    expect(updatePasswordAfterRecovery).toHaveBeenCalledWith("Passw0rd!")
    expect(await screen.findByText("パスワードを再設定しました")).toBeInTheDocument()

    expect(await screen.findByRole("heading", { name: "サインイン" })).toBeInTheDocument()
  })

  it("OTP を再送できる", async () => {
    const user = userEvent.setup()
    const sendPasswordResetCode = vi.fn().mockResolvedValue(null)
    const defaultProps = createDefaultProps({
      ...createActions(),
      sendPasswordResetCode,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.click(screen.getByRole("button", { name: "パスワードリセット" }))

    expect(sendPasswordResetCode).toHaveBeenCalledExactlyOnceWith("user@example.com")
    expect(
      await screen.findByText("パスワードリセット用のメールを送信しました"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "確認メールを再送する" }))
    expect(sendPasswordResetCode).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByText("パスワードリセット用のメールを再送しました"),
    ).toBeInTheDocument()

    expect(await screen.findByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()
  })

  it("OTP の確認失敗時にパスワード再設定画面へ進まない", async () => {
    const user = userEvent.setup()
    const error = new Error("認証失敗")
    const sendPasswordResetCode = vi.fn().mockResolvedValue(null)
    const verifyPasswordResetCode = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(null)
    const updatePasswordAfterRecovery = vi.fn()
    const defaultProps = createDefaultProps({
      ...createActions(),
      sendPasswordResetCode,
      verifyPasswordResetCode,
      updatePasswordAfterRecovery,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")

    await user.click(screen.getByRole("button", { name: "パスワードリセット" }))

    expect(sendPasswordResetCode).toHaveBeenCalledWith("user@example.com")
    expect(
      await screen.findByText("パスワードリセット用のメールを送信しました"),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText("確認コード"), "123456")

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    expect(verifyButton).toBeEnabled()

    await user.click(verifyButton)

    expect(verifyPasswordResetCode).toHaveBeenCalledWith("user@example.com", "123456")
    expect(
      await screen.findByText("認証処理に失敗しました。時間をおいて再度お試しください"),
    ).toBeInTheDocument()
    expect(updatePasswordAfterRecovery).not.toHaveBeenCalled()
    expect(await screen.findByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument()

    await user.type(screen.getByLabelText("確認コード"), "654321")
    await user.click(verifyButton)

    expect(verifyPasswordResetCode).toHaveBeenCalledWith("user@example.com", "654321")
    expect(verifyPasswordResetCode).toHaveBeenCalledTimes(2)

    expect(await screen.findByText("認証に成功しました")).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "新しいパスワードの設定" }),
    ).toBeInTheDocument()
  })

  it("パスワード変更失敗時に新しいパスワード画面に残る", async () => {
    const user = userEvent.setup()
    const updatePasswordAfterRecovery = vi.fn().mockRejectedValueOnce(null).mockResolvedValue(null)
    const defaultProps = createDefaultProps({
      ...createActions(),
      updatePasswordAfterRecovery,
    })

    render(CloudSyncPanel, { props: defaultProps })

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.click(screen.getByRole("button", { name: "パスワードリセット" }))

    await user.type(screen.getByLabelText("確認コード"), "123456")

    const verifyButton = screen.getByRole("button", { name: "認証する" })
    expect(verifyButton).toBeEnabled()

    await user.click(verifyButton)

    const passwordResetInput = screen.getByLabelText("新しいパスワード")
    const passwordResetButton = screen.getByRole("button", { name: "パスワードを設定" })

    await user.type(passwordResetInput, "Passw0rd!")
    await user.click(passwordResetButton)

    expect(updatePasswordAfterRecovery).toHaveBeenCalledWith("Passw0rd!")
    expect(
      await screen.findByText("認証処理に失敗しました。時間をおいて再度お試しください"),
    ).toBeInTheDocument()

    await user.clear(passwordResetInput)
    await user.type(passwordResetInput, "Reset42@")
    await user.click(passwordResetButton)

    expect(updatePasswordAfterRecovery).toHaveBeenCalledWith("Reset42@")
    expect(await screen.findByText("パスワードを再設定しました")).toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: "サインイン" })).toBeInTheDocument()
  })
})
