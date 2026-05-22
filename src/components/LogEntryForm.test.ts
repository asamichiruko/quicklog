import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import LogEntryForm from "./LogEntryForm.vue"

describe("LogEntryForm", () => {
  it("textarea に入力したテキストが form の submit で emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)
    const textarea = screen.getByLabelText("メモ")

    await user.type(textarea, "text1")
    await user.click(screen.getByRole("button", { name: "記録" }))

    expect(emitted("submit")).toEqual([["text1"]])
    expect(textarea).toHaveValue("")
  })

  it("入力したテキストの前後の空白は trim されて emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)

    await user.type(screen.getByLabelText("メモ"), "  a  b  ")
    await user.click(screen.getByRole("button", { name: "記録" }))

    expect(emitted("submit")).toEqual([["a  b"]])
  })

  it("textarea に入力しない状態で submit をしても emit されない", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)

    await user.click(screen.getByRole("button", { name: "記録" }))

    expect(emitted("submit")).toBeUndefined()
  })

  it("空白を入力して submit しても emit されない", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)

    await user.type(screen.getByLabelText("メモ"), "  \n")
    await user.click(screen.getByRole("button", { name: "記録" }))

    expect(emitted("submit")).toBeUndefined()
  })

  it("Ctrl+Enter で emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)

    await user.type(screen.getByLabelText("メモ"), "text1")
    await user.keyboard("{Control>}{Enter}{/Control}")

    expect(emitted("submit")).toEqual([["text1"]])
  })

  it("Meta+Enter で emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)

    await user.type(screen.getByLabelText("メモ"), "text1")
    await user.keyboard("{Meta>}{Enter}{/Meta}")

    expect(emitted("submit")).toEqual([["text1"]])
  })

  it("Enter では emit されない", async () => {
    const user = userEvent.setup()
    const { emitted } = render(LogEntryForm)

    await user.type(screen.getByLabelText("メモ"), "text1")
    await user.keyboard("{Enter}")

    expect(emitted("submit")).toBeUndefined()
  })
})
