import { describe, expect, it } from "vitest"
import SettingsButton from "./SettingsButton.vue"
import { render, screen } from "@testing-library/vue"
import userEvent from "@testing-library/user-event"

describe("SettingsButton", () => {
  it("button を click すると emit される", async () => {
    const user = userEvent.setup()
    const { emitted } = render(SettingsButton)

    await user.click(screen.getByRole("button", { name: "設定" }))

    expect(emitted("click")).toEqual([[]])
  })
})
