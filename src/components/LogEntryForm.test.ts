import { mount } from "@vue/test-utils"
import {describe, expect, it} from "vitest"
import LogEntryForm from "./LogEntryForm.vue"

describe("LogEntryForm", () => {
  it("textarea に入力したテキストが form の submit で emit される", async () => {
    const wrapper = mount(LogEntryForm)

    await wrapper.find("textarea").setValue("text1")
    await wrapper.find("form").trigger("submit")

    expect(wrapper.emitted("submit")).toEqual([["text1"]])
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("")
  })

  it("入力したテキストの前後の空白は trim されて emit される", async () => {
    const wrapper = mount(LogEntryForm)

    await wrapper.find("textarea").setValue("  a  b  ")
    await wrapper.find("form").trigger("submit")

    expect(wrapper.emitted("submit")).toEqual([["a  b"]])
  })

  it("textarea に入力しない状態で submit をしても emit されない", async () => {
    const wrapper = mount(LogEntryForm)

    await wrapper.find("textarea").setValue("")
    await wrapper.find("form").trigger("submit")

    expect(wrapper.emitted("submit")).toBeUndefined()
  })

  it("空白を入力して submit しても emit されない", async () => {
    const wrapper = mount(LogEntryForm)

    await wrapper.find("textarea").setValue("  \n")
    await wrapper.find("form").trigger("submit")

    expect(wrapper.emitted("submit")).toBeUndefined()
  })

  it("Ctrl+Enter で emit される", async () => {
    const wrapper = mount(LogEntryForm)

    const textarea = await wrapper.find("textarea")
    textarea.setValue("text1")
    textarea.trigger("keydown.ctrl.enter")
    expect(wrapper.emitted("submit")).toEqual([["text1"]])
  })

  it("Meta+Enter で emit される", async () => {
    const wrapper = mount(LogEntryForm)

    const textarea = await wrapper.find("textarea")
    textarea.setValue("text1")
    textarea.trigger("keydown.meta.enter")
    expect(wrapper.emitted("submit")).toEqual([["text1"]])
  })

  it("Enter では emit されない", async () => {
    const wrapper = mount(LogEntryForm)

    const textarea = await wrapper.find("textarea")
    textarea.setValue("text1")
    textarea.trigger("keydown.enter")
    expect(wrapper.emitted("submit")).toBeUndefined()
  })
})
