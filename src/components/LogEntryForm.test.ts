import { mount } from "@vue/test-utils"
import {describe, expect, it} from "vitest"
import LogEntryForm from "./LogEntryForm.vue"

describe("LogEntryForm", () => {
  it("入力したテキストを submit で emit する", async () => {
    const wrapper = mount(LogEntryForm)

    await wrapper.find("textarea").setValue("text1")
    await wrapper.find("form").trigger("submit")

    expect(wrapper.emitted("submit")).toEqual([["text1"]])
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("")
  })
})
