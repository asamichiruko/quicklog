import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import SettingsDialog from "./SettingsDialog.vue"
import { defineComponent, ref } from "vue"
import type { ExportType, RuntimeSessionState } from "@/types"
import type { CloudSyncAccountActions } from "@/components/CloudSyncAccountPanel.vue"

function createCloudSyncAccountActions(
  overrides: Partial<CloudSyncAccountActions> = {},
): CloudSyncAccountActions {
  return {
    syncLogEntries: vi.fn(),
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
    ...overrides,
  }
}

const TestHost = defineComponent({
  components: { SettingsDialog },
  setup() {
    const dialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
    const settings = ref({ showDailySummary: false })
    const logEntries = ref([
      { id: "id1", text: "text1", createdAt: "2026-05-21T12:00:00.000Z" },
      { id: "id2", text: "text2", createdAt: "2026-05-22T00:00:00.000Z" },
      { id: "id3", text: "text3", createdAt: "2026-05-22T12:00:00.000Z" },
    ])
    const savedSettings = ref<unknown>(null)
    const exportType = ref<ExportType | null>(null)
    const importedFile = ref<File | null>(null)
    const runtimeSessionState = ref<RuntimeSessionState>({
      scope: { type: "anonymous" },
      syncStatus: "disabled",
    })
    const anonymousDataState = ref({ logEntryCount: 0, logEntryDeletionCount: 0 })
    const signedInEmail = ref("")
    const signedInPassword = ref("")

    function enableSummary() {
      settings.value = { showDailySummary: true }
    }

    function saveSettings(nextSettings: { showDailySummary: boolean }) {
      settings.value = nextSettings
      savedSettings.value = nextSettings
    }

    async function signInWithEmail(email: string, password: string) {
      signedInEmail.value = email
      signedInPassword.value = password
    }

    const cloudSyncAccountActions = createCloudSyncAccountActions({
      signInWithEmail,
    })

    return {
      dialog,
      settings,
      logEntries,
      enableSummary,
      saveSettings,
      savedSettings,
      exportType,
      importedFile,
      runtimeSessionState,
      anonymousDataState,
      signedInEmail,
      signedInPassword,
      deleteAnonymousData: vi.fn(),
      cloudSyncAccountActions,
    }
  },
  template: `
  <button type="button" @click="dialog?.open()">設定を開く</button>
  <button type="button" @click="enableSummary">settings を変更</button>
  <SettingsDialog
    ref="dialog"
    :settings="settings"
    :log-entries="logEntries"
    @save="saveSettings"
    @export="exportType = $event"
    @import="importedFile = $event"
    :session="null"
    :runtime-session-state="runtimeSessionState"
    :anonymous-data-state="anonymousDataState"
    :delete-anonymous-data="deleteAnonymousData"
    :cloud-sync-account-actions="cloudSyncAccountActions"
  />

  <output data-testid="saved-settings">{{ JSON.stringify(savedSettings) }}</output>
  <output data-testid="export-type">{{ exportType ?? "" }}</output>
  <output data-testid="import-file-name">{{ importedFile?.name ?? "" }}</output>
  <output data-testid="signed-in-email">{{ signedInEmail }}</output>
  <output data-testid="signed-in-password">{{ signedInPassword }}</output>
  `,
})

describe("SettingsDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("open で dialog が表示される", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(container.querySelector("dialog")).toHaveAttribute("open")
  })

  it("設定を保存 ボタンを押すと設定が保存される", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("button", { name: "表示" }))

    const saveButton = screen.getByRole("button", { name: "設定を保存" })
    expect(saveButton).toBeDisabled()

    await user.click(screen.getByRole("checkbox", { name: "日別サマリーを表示" }))

    expect(saveButton).toBeEnabled()
    await user.click(saveButton)
    expect(saveButton).toBeDisabled()

    expect(screen.getByTestId("saved-settings")).toHaveTextContent(
      JSON.stringify({ showDailySummary: true }),
    )
    expect(container.querySelector("dialog")).toHaveAttribute("open")
  })

  it("リセット ボタンを押すと設定が初期化される", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("button", { name: "表示" }))

    const showDailySummary = screen.getByRole("checkbox", { name: "日別サマリーを表示" })
    expect(showDailySummary).not.toBeChecked()

    await user.click(showDailySummary)
    await user.click(screen.getByRole("button", { name: "リセット" }))

    expect(showDailySummary).not.toBeChecked()
    expect(screen.getByRole("button", { name: "設定を保存" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "リセット" })).toBeDisabled()
  })

  it("閉じるボタンを押すと設定が保存されずに dialog が閉じる", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("button", { name: "表示" }))
    await user.click(screen.getByRole("checkbox", { name: "日別サマリーを表示" }))
    await user.click(screen.getByRole("button", { name: "閉じる" }))

    expect(screen.getByTestId("saved-settings")).toHaveTextContent("null")
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("戻るボタンを押すと設定が保存されずに index に戻る", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("button", { name: "表示" }))
    await user.click(screen.getByRole("checkbox", { name: "日別サマリーを表示" }))
    await user.click(screen.getByRole("button", { name: "戻る" }))

    expect(screen.getByTestId("saved-settings")).toHaveTextContent("null")
    expect(container.querySelector("dialog")).toHaveAttribute("open")
    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument()
  })

  it("props で与えた初期値が UI に反映される", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "settings を変更" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("button", { name: "表示" }))

    expect(screen.getByRole("checkbox", { name: "日別サマリーを表示" })).toBeChecked()
  })

  it("クラウド同期のパスワード欄で Enter を押すと設定 dialog を閉じずにサインインする", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    await user.click(screen.getByRole("button", { name: "アカウントと同期" }))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")
    await user.keyboard("{Enter}")

    expect(screen.getByTestId("signed-in-email")).toHaveTextContent("user@example.com")
    expect(screen.getByTestId("signed-in-password")).toHaveTextContent("Passw0rd!")
    expect(screen.getByTestId("saved-settings")).toHaveTextContent("null")
    expect(container.querySelector("dialog")).toHaveAttribute("open")
  })

  it("パスワードリセットの確認待ちなら開き直しても確認コード入力画面を表示する", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    await user.click(screen.getByRole("button", { name: "アカウントと同期" }))
    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }))
    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com")
    await user.click(screen.getByRole("button", { name: "パスワードリセット" }))

    expect(await screen.findByLabelText("確認コード")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "閉じる" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(screen.getByRole("heading", { name: "アカウントと同期", level: 2 })).toBeInTheDocument()
    expect(screen.getByLabelText("確認コード")).toBeInTheDocument()
  })

  it("パスワードリセットの認証後なら開き直しても新しいパスワード設定画面を表示する", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    await user.click(screen.getByRole("button", { name: "アカウントと同期" }))
    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }))
    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com")
    await user.click(screen.getByRole("button", { name: "パスワードリセット" }))
    await user.type(await screen.findByLabelText("確認コード"), "123456")
    await user.click(screen.getByRole("button", { name: "認証する" }))

    expect(await screen.findByLabelText("新しいパスワード")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "閉じる" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(screen.getByRole("heading", { name: "アカウントと同期", level: 2 })).toBeInTheDocument()
    expect(screen.getByLabelText("新しいパスワード")).toBeInTheDocument()
  })

  it("アカウント作成の確認待ちなら開き直しても確認コード入力画面を表示する", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    await user.click(screen.getByRole("button", { name: "アカウントと同期" }))
    await user.click(screen.getByRole("button", { name: "アカウントを作成する" }))
    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }))

    expect(screen.queryByLabelText("確認コード")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "閉じる" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(screen.getByRole("heading", { name: "アカウントと同期", level: 2 })).toBeInTheDocument()
    expect(screen.getByLabelText("確認コード")).toBeInTheDocument()
  })

  it("開き直すと 記録のインポート パネルが閉じて入力状態がリセットされる", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("button", { name: "記録のインポート" }))
    expect(screen.getByRole("heading", { name: "記録のインポート" })).toBeInTheDocument()

    const file = new File(
      [JSON.stringify([{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }])],
      "quicklog.json",
      { type: "application/json" },
    )
    await user.upload(screen.getByLabelText("インポートする JSON ファイル"), file)

    expect(screen.getByText("quicklog.json")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "閉じる" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "記録のインポート" }))

    expect(screen.getByText("選択されていません")).toBeInTheDocument()
  })

  it("開き直すと 記録のエクスポート パネルが閉じて入力状態がリセットされる", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    await user.click(screen.getByRole("button", { name: "記録のエクスポート" }))
    expect(screen.getByRole("heading", { name: "記録のエクスポート" })).toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: "Markdown" }))
    expect(screen.getByRole("radio", { name: "Markdown" })).toBeChecked()

    await user.click(screen.getByRole("button", { name: "閉じる" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "記録のエクスポート" }))

    expect(screen.getByRole("radio", { name: "JSON" })).toBeChecked()
  })

  it("開き直すと 記録のコピー パネルが閉じて入力状態がリセットされる", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 24))

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    await user.click(screen.getByRole("button", { name: "記録のコピー" }))
    expect(screen.getByRole("heading", { name: "記録のコピー" })).toBeInTheDocument()

    await fireEvent.update(screen.getByLabelText("開始日"), "2026-05-22")
    await fireEvent.update(screen.getByLabelText("終了日"), "2026-05-22")
    await user.click(screen.getByText("コピー内容を確認"))

    expect(screen.getByText("コピー内容を確認").closest("details")).toHaveAttribute("open")
    expect(screen.getByLabelText("開始日")).toHaveValue("2026-05-22")
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-05-22")

    await user.click(screen.getByRole("button", { name: "閉じる" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument()

    await user.click(screen.getByText("記録のコピー"))

    expect(screen.getByLabelText("開始日")).toHaveValue("2026-05-24")
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-05-24")
    expect(screen.queryByText("コピー内容を確認")).not.toBeInTheDocument()
  })
})
