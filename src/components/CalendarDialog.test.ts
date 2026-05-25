import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import { computed, defineComponent, ref } from "vue"
import CalendarDialog from "./CalendarDialog.vue"
import { getLocalDateKey } from "@/lib/date"
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
    const recordCounts = computed(() => {
      const counts = new Map<string, number>()

      for (const item of items.value) {
        const key = getLocalDateKey(new Date(item.createdAt))
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      return counts
    })

    return {
      dialog,
      selectedDate,
      initialDate,
      recordCounts,
    }
  },
  template: `
  <button type="button" @click="dialog?.open()">カレンダーを開く</button>
  <CalendarDialog
    ref="dialog"
    :initialDate="initialDate"
    :recordCounts="recordCounts"
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
    await user.click(screen.getByRole("button", { name: /5月22日金曜日、記録あり、移動/ }))

    expect(screen.getByTestId("selected-date")).toHaveTextContent("2026-05-21T15:00:00.000Z")
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("記録がない日付は選択できない", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))

    expect(screen.getByRole("button", { name: /5月1日金曜日、記録なし/ })).toBeDisabled()
  })

  it("表示月外で記録がある日付は選択できる", async () => {
    const user = userEvent.setup()
    render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))

    expect(screen.getByRole("button", { name: /4月30日木曜日、記録あり、移動/ })).toBeEnabled()
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

  it("閉じるボタン操作では select が emit されない", async () => {
    const user = userEvent.setup()
    const { emitted, container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))
    await user.click(screen.getByRole("button", { name: "閉じる" }))

    expect(emitted("select")).toBeUndefined()
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })

  it("Esc キーによるキャンセル操作では select が emit されない", async () => {
    const user = userEvent.setup()
    const { emitted, container } = render(TestHost)

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }))
    await user.click(screen.getByLabelText("表示する日付を選択"))
    await user.keyboard("{Escape}")

    expect(emitted("select")).toBeUndefined()
    expect(container.querySelector("dialog")).not.toHaveAttribute("open")
  })
})
