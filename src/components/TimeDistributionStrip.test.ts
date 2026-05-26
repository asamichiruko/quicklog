import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/vue"
import TimeDistributionStrip from "./TimeDistributionStrip.vue"

describe("TimeDistributionStrip", () => {
  it("記録時刻に従って分布が表示される", () => {
    const { container } = render(TimeDistributionStrip, {
      props: {
        logEntries: [
          { id: "id1", text: "text1", createdAt: "2026-05-21T15:00:00.000Z" },
          { id: "id2", text: "text2", createdAt: "2026-05-22T03:00:00.000Z" },
          { id: "id3", text: "text3", createdAt: "2026-05-22T09:00:00.000Z" },
        ],
      },
    })

    expect(screen.getByRole("img", { name: "記録時刻分布。3件の記録があります。" })).toBeInTheDocument()

    const marks = container.querySelectorAll(".time-mark")
    expect(marks).toHaveLength(3)
    expect(marks[0]).toHaveStyle({ left: "0%" })
    expect(marks[1]).toHaveStyle({ left: "50%" })
    expect(marks[2]).toHaveStyle({ left: "75%" })
  })
})
