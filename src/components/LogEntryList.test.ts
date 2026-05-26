import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import LogEntryList from "./LogEntryList.vue"

describe("LogEntryList", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("items が空なら空の表示が出る", () => {
    render(LogEntryList, {
      props: {
        logEntries: [],
        showDailySummary: false,
      }
    })

    expect(screen.getByText("まだメモがありません")).toBeInTheDocument();
  })

  it("items の text と記録時刻が表示される", () => {
    render(LogEntryList, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
        ],
        showDailySummary: false,
      }
    })

    expect(screen.getByText("text1")).toBeInTheDocument();
    expect(screen.getByText("09:00:00")).toBeInTheDocument();
  })

  it("items が日付ごとにグループ化される", () => {
    vi.useFakeTimers()

    const now = new Date(2026, 4, 22, 12, 0, 0, 0)
    vi.setSystemTime(now)

    render(LogEntryList, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
          { id: "id2", text: "text2", createdAt: "2026-05-22T12:00:00.000Z" },
          { id: "id3", text: "text3", createdAt: "2026-05-21T12:00:00.000Z" },
        ],
        showDailySummary: true,
      }
    })

    const headings = screen.getAllByRole("heading", { level: 2 })

    expect(headings).toHaveLength(2)
    expect(headings[0]).toHaveTextContent("今日 - 2026年5月22日(金)");
    expect(headings[0]).toHaveTextContent("2 件");
    expect(headings[1]).toHaveTextContent("昨日 - 2026年5月21日(木)");
    expect(headings[1]).toHaveTextContent("1 件");
  })

  it("削除ボタンを押すと remove が emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryList, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
        ],
        showDailySummary: false,
      }
    })

    await user.click(screen.getByRole("button", { name: "削除" }))

    expect(emitted("remove")).toEqual([["id1"]])
  })

  it("showDailySummary が false のとき TimeDistributionStrip と件数が表示されない", () => {
    vi.useFakeTimers()

    const now = new Date(2026, 4, 22, 12, 0, 0, 0)
    vi.setSystemTime(now)

    const { container } = render(LogEntryList, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
        ],
        showDailySummary: false,
      }
    })

    const heading = container.querySelector(".date-heading")

    expect(heading).toHaveTextContent("今日 - 2026年5月22日(金)");
    expect(heading).not.toHaveTextContent("1 件");

    expect(screen.queryByRole("img", { name: "記録時刻分布。1件の記録があります。" })).not.toBeInTheDocument()
  })

  it("showDailySummary が true のとき TimeDistributionStrip と件数が表示される", () => {
    vi.useFakeTimers()

    const now = new Date(2026, 4, 22, 12, 0, 0, 0)
    vi.setSystemTime(now)

    render(LogEntryList, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" },
        ],
        showDailySummary: true,
      }
    })

    const heading = screen.getByRole("heading", { level: 2 })

    expect(heading).toHaveTextContent("今日 - 2026年5月22日(金)");
    expect(heading).toHaveTextContent("1 件");

    expect(screen.queryByRole("img", { name: "記録時刻分布。1件の記録があります。" })).toBeInTheDocument()
  })
})
