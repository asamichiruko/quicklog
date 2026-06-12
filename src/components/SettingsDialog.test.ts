import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import SettingsDialog from "./SettingsDialog.vue"
import { defineComponent, ref } from "vue"
import type { ExportType, RuntimeSessionState } from "@/types"

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
    const runtimeSessionState = ref<RuntimeSessionState>({ scope: { type: "anonymous" }, syncStatus: "disabled" })
    const anonymousDataState = ref({ logEntryCount: 0, logEntryDeletionCount: 0 })
    const signedInEmail = ref("")
    const signedInPassword = ref("")

    function enableSummary() {
      settings.value = { showDailySummary: true }
    }

    async function signInWithEmail(email: string, password: string) {
      signedInEmail.value = email
      signedInPassword.value = password
    }

    return {
      dialog,
      settings,
      logEntries,
      enableSummary,
      savedSettings,
      exportType,
      importedFile,
      runtimeSessionState,
      anonymousDataState,
      signedInEmail,
      signedInPassword,
      signInWithEmail,
      signUpWithEmail: vi.fn(),
      signOut: vi.fn(),
      deleteAnonymousData: vi.fn(),
      deleteCloudSync: vi.fn(),
    }
  },
  template: `
  <button type="button" @click="dialog?.open()">設定を開く</button>
  <button type="button" @click="enableSummary">settings を変更</button>
  <SettingsDialog
    ref="dialog"
    :settings="settings"
    :log-entries="logEntries"
    @save="savedSettings = $event"
    @export="exportType = $event"
    @import="importedFile = $event"
    :session="null"
    :sign-in-with-email="signInWithEmail"
    :sign-up-with-email="signUpWithEmail"
    :sign-out="signOut"
    :runtime-session-state="runtimeSessionState"
    :anonymous-data-state="anonymousDataState"
    :delete-anonymous-data="deleteAnonymousData"
    :delete-cloud-sync="deleteCloudSync"
  />

  <output data-testid="saved-settings">{{ JSON.stringify(savedSettings) }}</output>
  <output data-testid="export-type">{{ exportType ?? "" }}</output>
  <output data-testid="import-file-name">{{ importedFile?.name ?? "" }}</output>
  <output data-testid="signed-in-email">{{ signedInEmail }}</output>
  <output data-testid="signed-in-password">{{ signedInPassword }}</output>
  `
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

  it("保存ボタンを押すと設定が保存されて dialog が閉じる", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("checkbox", { name: "日別サマリーを表示" }))
    await user.click(screen.getByRole("button", { name: "設定を保存" }))

    expect(screen.getByTestId("saved-settings")).toHaveTextContent(
      JSON.stringify({ showDailySummary: true }),
    )
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("キャンセルを押すと設定が保存されずに dialog が閉じる", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByRole("checkbox", { name: "日別サマリーを表示" }))
    await user.click(screen.getByRole("button", { name: "キャンセル" }))

    expect(screen.getByTestId("saved-settings")).toHaveTextContent("null")
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("props で与えた初期値が UI に反映される", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "settings を変更" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(screen.getByRole("checkbox", { name: "日別サマリーを表示" })).toBeChecked()
  })

  it("クラウド同期のパスワード欄で Enter を押すと設定 dialog を閉じずにサインインする", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))
    await user.click(screen.getByText("クラウド同期"))
    await user.type(screen.getByLabelText("メールアドレス"), " user@example.com ")
    await user.type(screen.getByLabelText("パスワード"), "Passw0rd!")
    await user.keyboard("{Enter}")

    expect(screen.getByTestId("signed-in-email")).toHaveTextContent("user@example.com")
    expect(screen.getByTestId("signed-in-password")).toHaveTextContent("Passw0rd!")
    expect(screen.getByTestId("saved-settings")).toHaveTextContent("null")
    expect(container.querySelector("dialog")).toHaveAttribute("open")
  })

  it("開き直すと 記録のインポート パネルが閉じて入力状態がリセットされる", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    const importPanel = screen.getByText("記録のインポート").closest("details")
    expect(importPanel).not.toBeNull()

    await user.click(screen.getByText("記録のインポート"))
    expect(importPanel).toHaveAttribute("open")

    const file = new File(
      [JSON.stringify([{ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" }])],
      "quicklog.json",
      { type: "application/json" },
    )
    await user.upload(screen.getByLabelText("インポートする JSON ファイル"), file)

    expect(screen.getByText("quicklog.json")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "キャンセル" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(importPanel).not.toHaveAttribute("open")

    await user.click(screen.getByText("記録のインポート"))

    expect(screen.getByText("選択されていません")).toBeInTheDocument()
  })

  it("開き直すと 記録のエクスポート パネルが閉じて入力状態がリセットされる", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    const exportPanel = screen.getByText("記録のエクスポート").closest("details")
    expect(exportPanel).not.toBeNull()

    await user.click(screen.getByText("記録のエクスポート"))
    expect(exportPanel).toHaveAttribute("open")

    await user.click(screen.getByRole("radio", { name: "Markdown" }))
    expect(screen.getByRole("radio", { name: "Markdown" })).toBeChecked()

    await user.click(screen.getByRole("button", { name: "キャンセル" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(exportPanel).not.toHaveAttribute("open")

    await user.click(screen.getByText("記録のエクスポート"))

    expect(screen.getByRole("radio", { name: "JSON" })).toBeChecked()
  })

  it("開き直すと 記録のコピー パネルが閉じて入力状態がリセットされる", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 24))

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    const copyPanel = screen.getByText("記録のコピー").closest("details")
    expect(copyPanel).not.toBeNull()

    await user.click(screen.getByText("記録のコピー"))
    expect(copyPanel).toHaveAttribute("open")

    await fireEvent.update(screen.getByLabelText("開始日"), "2026-05-22")
    await fireEvent.update(screen.getByLabelText("終了日"), "2026-05-22")
    await user.click(screen.getByText("コピー内容を確認"))

    expect(screen.getByText("コピー内容を確認").closest("details")).toHaveAttribute("open")
    expect(screen.getByLabelText("開始日")).toHaveValue("2026-05-22")
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-05-22")

    await user.click(screen.getByRole("button", { name: "キャンセル" }))
    await user.click(screen.getByRole("button", { name: "設定を開く" }))

    expect(copyPanel).not.toHaveAttribute("open")

    await user.click(screen.getByText("記録のコピー"))

    expect(screen.getByLabelText("開始日")).toHaveValue("2026-05-24")
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-05-24")
    expect(screen.queryByText("コピー内容を確認")).not.toBeInTheDocument()
  })
})
