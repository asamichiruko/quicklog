import App from "@/App.vue"
import {
  clearLocalAuthSession,
  deleteCurrentAccount,
  getCurrentSession,
  getCurrentUser,
  signInWithEmail,
  signOut,
} from "@/lib/auth"
import { fetchCloudLogEntries, upsertCloudLogEntries } from "@/lib/logEntryRepository"
import {
  fetchCloudLogEntryDeletions,
  recordLogEntryDeletions,
} from "@/lib/logEntryDeletionRepository"
import {
  loadQuicklogData,
  loadSettings,
  loadStoredDataScope,
  saveQuicklogData,
  saveStoredDataScope,
} from "@/lib/storage"
import type { LogEntry, QuicklogData } from "@/types"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import userEvent from "@testing-library/user-event"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/vue"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const subscription = vi.hoisted(() => ({ onAuthStateChange: vi.fn(), unsubscribe: vi.fn() }))
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { onAuthStateChange: subscription.onAuthStateChange } },
}))
vi.mock("@/lib/auth", () => ({
  getCurrentSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  clearLocalAuthSession: vi.fn(),
  deleteCurrentAccount: vi.fn(),
  signUpWithEmail: vi.fn(),
  resendSignUpCode: vi.fn(),
  sendPasswordResetCode: vi.fn(),
  updatePasswordAfterRecovery: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  verifySignUpCode: vi.fn(),
  changePassword: vi.fn(),
  requestEmailChange: vi.fn(),
  resendEmailChangeConfirmation: vi.fn(),
}))
vi.mock("@/lib/logEntryRepository", () => ({
  fetchCloudLogEntries: vi.fn(),
  upsertCloudLogEntries: vi.fn(),
}))
vi.mock("@/lib/logEntryDeletionRepository", () => ({
  fetchCloudLogEntryDeletions: vi.fn(),
  recordLogEntryDeletions: vi.fn(),
}))

const now = new Date("2026-10-14T03:00:00.000Z")
const account = { id: "user1", email: "before@example.com" } as User
const session = { user: account } as Session
const localEntry = { id: "local1", text: "端末のメモ", createdAt: now.toISOString() }
const cloudEntry = { id: "cloud1", text: "クラウドのメモ", createdAt: now.toISOString() }
function createData(...logEntries: LogEntry[]): QuicklogData {
  return { version: 3, logEntries, logEntryDeletions: [] }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}
let authEvent!: (event: AuthChangeEvent, session: Session | null) => void

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  // Date と timeout のみを制御し、flushPromises の setImmediate は実時間で動かす。
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
  vi.setSystemTime(now)
  subscription.onAuthStateChange.mockImplementation((callback: typeof authEvent) => {
    authEvent = callback
    return { data: { subscription: { unsubscribe: subscription.unsubscribe } } }
  })
  vi.mocked(upsertCloudLogEntries).mockResolvedValue(undefined)
  vi.mocked(recordLogEntryDeletions).mockResolvedValue(undefined)
  vi.mocked(clearLocalAuthSession).mockResolvedValue(undefined)
  // happy-dom が再現しないダイアログ表示だけを補う。内容や子コンポーネントは実物。
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.open = true
  })
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.open = false
  })
  vi.stubGlobal("alert", vi.fn())
  vi.stubGlobal("confirm", vi.fn())
})
afterEach(() => {
  cleanup() // lifecycle の解除処理は fake timer と spy が有効な間に実行する。
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})
function setup() {
  const view = render(App)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  return { ...view, user }
}
async function flushAuthAndRender() {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0) // 認証イベントの外で予約された account user 取得を完了させる。
  await flushPromises()
}
async function openAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "設定" }))
  await user.click(screen.getByRole("button", { name: "アカウントと同期" }))
  await flushAuthAndRender()
}
async function startDeletion(user: ReturnType<typeof userEvent.setup>) {
  await openAccount(user)
  await user.click(
    screen.getByText("クラウド同期アカウントとデータを削除", { selector: "summary" }),
  )
  await user.click(screen.getByRole("button", { name: "削除する" }))
}
async function submitMemo(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: "メモ" }), text)
  await user.click(screen.getByRole("button", { name: "記録" }))
}

describe("App: ローカル操作から表示・永続化まで", () => {
  it("匿名でメモを記録すると保存・表示して入力を消し、再起動後も復元する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    const { user, unmount } = setup()
    await flushAuthAndRender()

    await submitMemo(user, "新しいメモ")

    expect(within(screen.getByRole("main")).getByText("新しいメモ")).toBeVisible()
    expect(screen.getByRole("textbox", { name: "メモ" })).toHaveValue("")
    const saved = loadQuicklogData()
    expect(saved.logEntries).toEqual([
      { id: expect.any(String), text: "新しいメモ", createdAt: "2026-10-14T03:00:00.000Z" },
    ])

    unmount()
    setup()
    await flushAuthAndRender()

    expect(within(screen.getByRole("main")).getByText("新しいメモ")).toBeVisible()
    expect(loadQuicklogData()).toEqual(saved)

    await vi.advanceTimersByTimeAsync(1000)

    expect(fetchCloudLogEntries).not.toHaveBeenCalled()
  })

  it("匿名で記録の保存に失敗すると入力と既存の表示・保存データを保持する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    saveQuicklogData(createData(localEntry))
    const { user } = setup()
    await flushAuthAndRender()
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError")
    })

    await submitMemo(user, "保存できないメモ")

    expect(alert).toHaveBeenCalledWith("メモの記録に失敗しました")
    expect(screen.getByRole("textbox", { name: "メモ" })).toHaveValue("保存できないメモ")
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(within(screen.getByRole("main")).queryByText("保存できないメモ")).not.toBeInTheDocument()
    expect(loadQuicklogData()).toEqual(createData(localEntry))
  })

  it("匿名の記録で削除をキャンセルすると表示と保存データを保持する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    saveQuicklogData(createData(localEntry))
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    vi.mocked(confirm).mockReturnValue(false)
    const { user } = setup()
    await flushAuthAndRender()

    await user.click(screen.getByRole("button", { name: "削除" }))

    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(loadQuicklogData()).toEqual(createData(localEntry))
  })

  it("匿名の記録で削除を確定すると表示から除き削除履歴を保存する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    saveQuicklogData(createData(localEntry))
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    vi.mocked(confirm).mockReturnValue(true)
    const { user } = setup()
    await flushAuthAndRender()

    await user.click(screen.getByRole("button", { name: "削除" }))

    expect(within(screen.getByRole("main")).queryByText(localEntry.text)).not.toBeInTheDocument()
    expect(loadQuicklogData()).toEqual({
      version: 3,
      logEntries: [],
      logEntryDeletions: [{ logEntryId: "local1", createdAt: "2026-10-14T03:00:00.000Z" }],
    })
  })

  it("匿名で表示設定を保存すると一覧へ反映し、再起動後も保持する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    saveQuicklogData(createData(localEntry))
    const { user, unmount } = setup()
    await flushAuthAndRender()

    await user.click(screen.getByRole("button", { name: "設定" }))
    await user.click(screen.getByRole("button", { name: "表示" }))
    await user.click(screen.getByRole("checkbox", { name: "日別サマリーを表示" }))
    await user.click(screen.getByRole("button", { name: "設定を保存" }))

    expect(loadSettings().showDailySummary).toBe(true)
    expect(screen.getByText("1 件")).toBeVisible()

    unmount()
    setup()
    await flushAuthAndRender()

    expect(screen.getByText("1 件")).toBeVisible()
  })

  it("匿名で JSON をインポートすると既存記録へマージして表示・保存する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    saveQuicklogData(createData(localEntry))
    const { user } = setup()
    await flushAuthAndRender()

    await user.click(screen.getByRole("button", { name: "設定" }))
    await user.click(screen.getByRole("button", { name: "記録のインポート" }))
    await user.upload(
      screen.getByLabelText("インポートする JSON ファイル"),
      new File([JSON.stringify(createData(cloudEntry))], "memos.json", {
        type: "application/json",
      }),
    )
    await user.click(screen.getByRole("button", { name: "ファイルをインポート" }))
    await flushAuthAndRender()

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 件のメモを追加、0 件のメモを削除しました",
    )
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(within(screen.getByRole("main")).getByText(cloudEntry.text)).toBeVisible()
    expect(loadQuicklogData().logEntries).toEqual(expect.arrayContaining([localEntry, cloudEntry]))
    expect(loadQuicklogData().logEntries).toHaveLength(2)
  })
})

describe("App: 認証状態と同期の接続", () => {
  it("保存済みユーザーの認証待ちで 10 秒経過すると同期停止となり、そのユーザーの記録を編集できる", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    vi.mocked(getCurrentSession).mockReturnValue(deferred<Session | null>().promise)
    const { user } = setup()
    await flushAuthAndRender()

    expect(screen.getByText("認証確認中")).toBeVisible()
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()

    await vi.advanceTimersByTimeAsync(9999)

    expect(screen.getByText("認証確認中")).toBeVisible()

    await vi.advanceTimersByTimeAsync(1)

    expect(screen.getByText("同期停止中")).toBeVisible()

    await submitMemo(user, "停止中のメモ")

    expect(loadQuicklogData(account.id).logEntries).toEqual([
      localEntry,
      { id: expect.any(String), text: "停止中のメモ", createdAt: "2026-10-14T03:00:10.000Z" },
    ])
    expect(loadQuicklogData().logEntries).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1000)

    expect(fetchCloudLogEntries).not.toHaveBeenCalled()
  })

  it("保存済みユーザーと同じセッションを復元するとクラウド記録を表示・保存する", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([cloudEntry])

    setup()
    await flushAuthAndRender()

    expect(screen.getByText("クラウド同期中")).toBeVisible()
    expect(within(screen.getByRole("main")).getByText(cloudEntry.text)).toBeVisible()
    expect(loadQuicklogData(account.id).logEntries).toEqual(
      expect.arrayContaining([localEntry, cloudEntry]),
    )
    expect(upsertCloudLogEntries).toHaveBeenCalledWith(
      expect.arrayContaining([localEntry, cloudEntry]),
      account,
    )
    // 正常な調停によって authPending timeout が解除されている。
    await vi.advanceTimersByTimeAsync(10000)

    expect(screen.queryByText("同期停止中")).not.toBeInTheDocument()
  })

  it("保存済みユーザーの認証取得に失敗すると記録を保持して同期停止にする", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.mocked(getCurrentSession).mockRejectedValueOnce(new Error("auth unavailable"))

    setup()
    await flushAuthAndRender()

    expect(screen.getByText("同期停止中")).toBeVisible()
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(loadQuicklogData(account.id)).toEqual(createData(localEntry))
    expect(fetchCloudLogEntries).not.toHaveBeenCalled()
  })

  it("匿名 scope で予期しないセッションを観測すると破棄し、匿名の表示・保存を維持する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    saveQuicklogData(createData(localEntry))
    vi.mocked(getCurrentSession).mockResolvedValue(session)

    setup()
    await flushAuthAndRender()

    expect(clearLocalAuthSession).toHaveBeenCalledOnce()
    expect(loadStoredDataScope()).toEqual({ type: "anonymous" })
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(loadQuicklogData()).toEqual(createData(localEntry))
    expect(fetchCloudLogEntries).not.toHaveBeenCalled()
  })

  it("匿名で明示的にサインインすると認証中イベントを無視し、記録をユーザーへ移して同期する", async () => {
    saveStoredDataScope({ type: "anonymous" })
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([cloudEntry])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveQuicklogData(createData(localEntry))
    saveQuicklogData(createData(cloudEntry), account.id)
    const { user } = setup()
    await flushAuthAndRender()

    await openAccount(user)

    vi.mocked(signInWithEmail).mockImplementation(async () => {
      authEvent("SIGNED_IN", session)
    })
    vi.mocked(getCurrentSession).mockResolvedValue(session)

    await user.type(screen.getByLabelText("メールアドレス"), account.email!)
    await user.type(screen.getByLabelText("パスワード"), "password1")
    await user.click(screen.getByRole("button", { name: "サインイン" }))
    await flushAuthAndRender()

    expect(signInWithEmail).toHaveBeenCalledWith(account.email, "password1")
    expect(clearLocalAuthSession).not.toHaveBeenCalled()
    expect(loadStoredDataScope()).toEqual({ type: "user", userId: account.id })
    expect(loadQuicklogData().logEntries).toHaveLength(0)
    expect(loadQuicklogData(account.id).logEntries).toEqual(
      expect.arrayContaining([localEntry, cloudEntry]),
    )
    expect(screen.getByText("クラウド同期中")).toBeVisible()
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(fetchCloudLogEntries).toHaveBeenCalledWith(account)
    expect(upsertCloudLogEntries).toHaveBeenCalledWith(
      expect.arrayContaining([localEntry, cloudEntry]),
      account,
    )
    expect(loadQuicklogData(account.id).logEntries).toHaveLength(2)
  })

  it("認証済みでメモを記録すると 1 秒後に同期し、クラウド記録も表示・保存する", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()
    vi.mocked(fetchCloudLogEntries).mockClear().mockResolvedValue([cloudEntry])

    await submitMemo(user, "同期するメモ")

    expect(loadQuicklogData(account.id).logEntries).toEqual([
      localEntry,
      { id: expect.any(String), text: "同期するメモ", createdAt: "2026-10-14T03:00:00.000Z" },
    ])

    await vi.advanceTimersByTimeAsync(999)

    expect(fetchCloudLogEntries).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushAuthAndRender()

    expect(fetchCloudLogEntries).toHaveBeenCalledExactlyOnceWith(account)
    expect(within(screen.getByRole("main")).getByText(cloudEntry.text)).toBeVisible()
    expect(loadQuicklogData(account.id).logEntries).toEqual(
      expect.arrayContaining([
        localEntry,
        cloudEntry,
        { id: expect.any(String), text: "同期するメモ", createdAt: "2026-10-14T03:00:00.000Z" },
      ]),
    )
    expect(loadQuicklogData(account.id).logEntries).toHaveLength(3)
  })

  it("自動同期の予約中に手動同期すると予約を解除し、同期結果を表示・保存する", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()

    await submitMemo(user, "手動で同期するメモ")
    await openAccount(user)

    vi.mocked(fetchCloudLogEntries).mockClear().mockResolvedValue([cloudEntry])

    await user.click(screen.getByRole("button", { name: "いますぐ同期" }))
    await flushAuthAndRender()

    expect(screen.getByRole("status")).toHaveTextContent(
      "同期しました（追加 1 件、削除 0 件、アップロード 2 件）",
    )
    expect(within(screen.getByRole("main")).getByText(cloudEntry.text)).toBeVisible()
    expect(loadQuicklogData(account.id).logEntries).toEqual(
      expect.arrayContaining([
        localEntry,
        cloudEntry,
        {
          id: expect.any(String),
          text: "手動で同期するメモ",
          createdAt: "2026-10-14T03:00:00.000Z",
        },
      ]),
    )
    expect(loadQuicklogData(account.id).logEntries).toHaveLength(3)

    await vi.advanceTimersByTimeAsync(1000)

    expect(fetchCloudLogEntries).toHaveBeenCalledExactlyOnceWith(account)
  })

  it("自動同期の予約中に unmount すると予約と online・画面復帰による同期を解除する", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user, unmount } = setup()
    await flushAuthAndRender()

    await submitMemo(user, "閉じる前のメモ")

    vi.mocked(fetchCloudLogEntries).mockClear()

    unmount()
    await vi.advanceTimersByTimeAsync(60000)
    window.dispatchEvent(new Event("online"))
    document.dispatchEvent(new Event("visibilitychange"))
    await flushAuthAndRender()

    expect(fetchCloudLogEntries).not.toHaveBeenCalled()
    expect(loadQuicklogData(account.id).logEntries).toEqual([
      localEntry,
      { id: expect.any(String), text: "閉じる前のメモ", createdAt: "2026-10-14T03:00:00.000Z" },
    ])
  })

  it("同期中にセッションを失うと遅れて返った結果を適用せず、そのユーザーの記録を保持する", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const response = deferred<LogEntry[]>()
    vi.mocked(fetchCloudLogEntries).mockReturnValue(response.promise)

    setup()
    await flushAuthAndRender()
    authEvent("SIGNED_OUT", null)
    await flushAuthAndRender()
    response.resolve([cloudEntry])
    await flushAuthAndRender()

    expect(screen.getByText("同期停止中")).toBeVisible()
    expect(within(screen.getByRole("main")).getByText(localEntry.text)).toBeVisible()
    expect(within(screen.getByRole("main")).queryByText(cloudEntry.text)).not.toBeInTheDocument()
    expect(loadQuicklogData(account.id)).toEqual(createData(localEntry))
  })

  it("認証済みでサインアウトすると匿名記録へ表示を切り替え、予約済みの同期を解除する", async () => {
    vi.mocked(signOut).mockResolvedValue(undefined)
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    saveQuicklogData(createData(cloudEntry))
    const { user } = setup()
    await flushAuthAndRender()

    await submitMemo(user, "ユーザーだけのメモ")
    await openAccount(user)

    vi.mocked(fetchCloudLogEntries).mockClear()

    await user.click(screen.getByRole("button", { name: "サインアウト" }))
    await flushAuthAndRender()

    expect(loadStoredDataScope()).toEqual({ type: "anonymous" })
    expect(within(screen.getByRole("main")).getByText(cloudEntry.text)).toBeVisible()
    expect(within(screen.getByRole("main")).queryByText(localEntry.text)).not.toBeInTheDocument()
    expect(loadQuicklogData(account.id).logEntries).toEqual([
      localEntry,
      { id: expect.any(String), text: "ユーザーだけのメモ", createdAt: "2026-10-14T03:00:00.000Z" },
    ])

    await vi.advanceTimersByTimeAsync(1000)

    expect(fetchCloudLogEntries).not.toHaveBeenCalled()
  })

  it("認証済みで画面が visible に戻ると最新メールを取得して表示する", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()

    await openAccount(user)

    vi.mocked(getCurrentUser)
      .mockClear()
      .mockResolvedValue({ ...account, email: "after@example.com" })
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")

    document.dispatchEvent(new Event("visibilitychange"))
    await flushAuthAndRender()

    expect(getCurrentUser).toHaveBeenCalledOnce()
    expect(screen.getByText("サインイン中: after@example.com")).toBeVisible()
  })

  it("認証済みで画面が hidden になるとユーザー情報を取得しない", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])

    setup()
    await flushAuthAndRender()

    vi.mocked(getCurrentUser).mockClear()
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")

    document.dispatchEvent(new Event("visibilitychange"))
    await flushAuthAndRender()

    expect(getCurrentUser).not.toHaveBeenCalled()
  })

  it("ユーザー情報の取得中に画面が visible に戻っても重ねて取得しない", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()

    await openAccount(user)

    const pendingUser = deferred<User | null>()
    vi.mocked(getCurrentUser).mockClear().mockReturnValueOnce(pendingUser.promise)
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")

    document.dispatchEvent(new Event("visibilitychange"))

    expect(getCurrentUser).toHaveBeenCalledOnce()

    document.dispatchEvent(new Event("visibilitychange"))

    expect(getCurrentUser).toHaveBeenCalledOnce()

    pendingUser.resolve({ ...account, email: "after@example.com" })
    await flushAuthAndRender()

    expect(screen.getByText("サインイン中: after@example.com")).toBeVisible()
  })

  it("認証済みで unmount すると購読を解除し画面復帰でもユーザー情報を取得しない", async () => {
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { unmount } = setup()
    await flushAuthAndRender()
    vi.mocked(getCurrentUser).mockClear()
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")

    unmount()
    document.dispatchEvent(new Event("visibilitychange"))
    await flushAuthAndRender()

    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  })
})

describe("App: アカウント削除前の同期保証", () => {
  it("認証済みでアカウント削除を開始すると同期完了・退避後に削除し、ユーザーデータを消す", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()
    const response = deferred<LogEntry[]>()
    vi.mocked(fetchCloudLogEntries).mockReturnValueOnce(response.promise)
    let anonymousBackupAtDeletion: QuicklogData | undefined
    let userDataAtDeletion: QuicklogData | undefined
    vi.mocked(deleteCurrentAccount).mockImplementationOnce(async () => {
      anonymousBackupAtDeletion = loadQuicklogData()
      userDataAtDeletion = loadQuicklogData(account.id)
    })

    await startDeletion(user)

    expect(deleteCurrentAccount).not.toHaveBeenCalled()

    response.resolve([cloudEntry])
    await flushAuthAndRender()

    expect(anonymousBackupAtDeletion).toEqual({
      version: 3,
      logEntries: expect.arrayContaining([localEntry, cloudEntry]),
      logEntryDeletions: [],
    })
    expect(anonymousBackupAtDeletion?.logEntries).toHaveLength(2)
    expect(userDataAtDeletion).toEqual(anonymousBackupAtDeletion)
    expect(deleteCurrentAccount).toHaveBeenCalledOnce()
    expect(loadStoredDataScope()).toEqual({ type: "anonymous" })
    expect(loadQuicklogData().logEntries).toEqual(expect.arrayContaining([localEntry, cloudEntry]))
    expect(loadQuicklogData(account.id).logEntries).toHaveLength(0)
    expect(within(screen.getByRole("main")).getByText(cloudEntry.text)).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("クラウド同期アカウントを削除しました")
  })

  it("アカウント削除前の同期が失敗すると削除せず、ユーザーデータと scope を保持する", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.mocked(fetchCloudLogEntries).mockRejectedValueOnce(new Error("offline"))

    await startDeletion(user)
    await flushAuthAndRender()

    expect(deleteCurrentAccount).not.toHaveBeenCalled()
    expect(loadQuicklogData(account.id)).toEqual(createData(localEntry))
    expect(loadStoredDataScope()).toEqual({ type: "user", userId: account.id })
    expect(screen.getByRole("status")).toHaveTextContent("クラウド同期に失敗しました")
  })

  it("アカウント削除前の同期中にセッションを失うと削除せず、匿名へ退避しない", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()
    const response = deferred<LogEntry[]>()
    vi.mocked(fetchCloudLogEntries).mockReturnValueOnce(response.promise)

    await startDeletion(user)
    authEvent("SIGNED_OUT", null)
    await flushAuthAndRender()
    response.resolve([cloudEntry])
    await flushAuthAndRender()

    expect(deleteCurrentAccount).not.toHaveBeenCalled()
    expect(loadQuicklogData(account.id)).toEqual(createData(localEntry))
    expect(loadQuicklogData().logEntries).toHaveLength(0)
    expect(screen.getByText("同期停止中")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("サインイン状態を確認できませんでした")
  })

  it("アカウント削除前の同期中に記録を追加すると古い同期結果を適用せず、削除しない", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(account)
    saveStoredDataScope({ type: "user", userId: account.id })
    saveQuicklogData(createData(localEntry), account.id)
    vi.mocked(getCurrentSession).mockResolvedValue(session)
    vi.mocked(fetchCloudLogEntries).mockResolvedValue([])
    vi.mocked(fetchCloudLogEntryDeletions).mockResolvedValue([])
    const { user } = setup()
    await flushAuthAndRender()
    const response = deferred<LogEntry[]>()
    vi.mocked(fetchCloudLogEntries).mockReturnValueOnce(response.promise)

    await startDeletion(user)
    // 削除を待つ間のローカル編集。dialog 外の form submit を直接送って競合を再現する。
    await fireEvent.update(screen.getByRole("textbox", { name: "メモ" }), "同期中のメモ")
    await fireEvent.submit(screen.getByRole("button", { name: "記録" }).closest("form")!)
    response.resolve([cloudEntry])
    await flushAuthAndRender()

    expect(deleteCurrentAccount).not.toHaveBeenCalled()
    expect(loadQuicklogData(account.id).logEntries).toEqual([
      localEntry,
      { id: expect.any(String), text: "同期中のメモ", createdAt: "2026-10-14T03:00:00.000Z" },
    ])
    expect(within(screen.getByRole("main")).queryByText(cloudEntry.text)).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("クラウド同期に失敗しました")
  })
})
