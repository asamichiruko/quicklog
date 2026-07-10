import NewLogEntryButton from "@/components/NewLogEntryButton.vue"
import { fireEvent, render, screen } from "@testing-library/vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

describe("NewLogEntryButton", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("初期表示時に scrollY <= 320 なら表示されない", async () => {
    // window.scrollY, window.addEventListener を mock する
    vi.spyOn(window, "scrollY", "get").mockReturnValue(320)

    render(NewLogEntryButton)
    await nextTick()

    expect(screen.queryByRole("button", { name: /メモを書く/ })).not.toBeInTheDocument()
  })

  it("初期表示時に scrollY > 320 なら表示される", async () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(321)

    render(NewLogEntryButton)
    await nextTick()

    expect(screen.queryByRole("button", { name: /メモを書く/ })).toBeInTheDocument()
  })

  it("非表示の状態から scrollY > 320 になると表示される", async () => {
    let scrollY = 320
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY)

    render(NewLogEntryButton)
    await nextTick()

    expect(screen.queryByRole("button", { name: /メモを書く/ })).not.toBeInTheDocument()

    scrollY = 321
    await fireEvent.scroll(window)

    expect(screen.queryByRole("button", { name: /メモを書く/ })).toBeInTheDocument()
  })

  it("表示された状態から scrollY < 120 である間は表示を維持し、scrollY < 120 になると表示されなくなる", async () => {
    let scrollY = 321
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY)

    render(NewLogEntryButton)
    await nextTick()

    expect(screen.queryByRole("button", { name: /メモを書く/ })).toBeInTheDocument()

    scrollY = 121
    await fireEvent.scroll(window)

    expect(screen.queryByRole("button", { name: /メモを書く/ })).toBeInTheDocument()

    scrollY = 120
    await fireEvent.scroll(window)

    expect(screen.queryByRole("button", { name: /メモを書く/ })).not.toBeInTheDocument()
  })
})
