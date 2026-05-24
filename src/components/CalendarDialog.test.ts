import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import { defineComponent, ref } from "vue"
import CalendarDialog from "./CalendarDialog.vue"
import type { LogEntry } from "@/types"

const TestHost = defineComponent({
  components: { CalendarDialog },
  setup() {
    const dialog = ref<InstanceType<typeof CalendarDialog> | null>(null)
    const selectedDate = ref<Date | null>(null)
    const initialDate = ref(new Date(2026, 4, 22))
    const items = ref<LogEntry[]>([
      { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000+09:00" },
      { id: "id2", text: "text2", createdAt: "2026-05-22T12:00:00.000+09:00" },
      { id: "id3", text: "text3", createdAt: "2026-04-30T12:00:00.000+09:00" },
    ])

    return {
      dialog,
      selectedDate,
      initialDate,
      items,
    }
  },
  template: `
  <button type="button" @click="dialog?.open()">カレンダーを開く</button>
  <CalendarDialog
    ref="dialog"
    :initialDate="initialDate"
    :items="items"
    @select="selectedDate = $event"
  />
  <output data-testid="selected-date">{{ selectedDate?.toISOString() ?? "" }}</output>
  `,
})

describe("CalendarDialog", () => {
  it("open で initialDate を含む月が表示される", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))

    expect(container.querySelector("dialog")).toHaveAttribute("open")
    expect(screen.getByText("2026年5月")).toBeInTheDocument()
  })

  it("記録がある日付を選択すると select されて閉じる", async () => {
    const user = userEvent.setup()
    const { container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))
    await user.click(screen.getByRole("button", { name: /5月22日金曜日、2件の記録へ移動/ }))

    expect(screen.getByTestId("selected-date")).toHaveTextContent("2026-05-21T15:00:00.000Z")
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("記録がない日付は選択できない", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))

    expect(screen.getByRole("button", { name: /5月1日金曜日、記録なし/ })).toBeDisabled()
  })

  it("前月と翌月へ移動できる", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))
    await user.click(screen.getByRole("button", { name: "前月を表示" }))

    expect(screen.getByText("2026年4月")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "翌月を表示" }))

    expect(screen.getByText("2026年5月")).toBeInTheDocument()
  })
})
