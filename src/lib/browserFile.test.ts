import { afterEach, describe, expect, it, vi } from "vitest"
import { downloadTextFile, readJsonFile } from "./browserFile"

describe("downloadTextFile", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("作成したリンクに URL と filename を設定してクリックする", async () => {
    const objectUrl = "blob:quicklog-download"
    const createObjectURL = vi.fn((_blob: Blob) => objectUrl)
    const revokeObjectURL = vi.fn()

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })

    const anchor = document.createElement("a")
    const click = vi.spyOn(anchor, "click").mockImplementation(() => {})
    vi.spyOn(document, "createElement").mockReturnValue(anchor)

    downloadTextFile({
      content: "content",
      mimeType: "text/markdown",
      filename: "quicklog.md",
    })

    expect(createObjectURL).toHaveBeenCalledOnce()

    const blob = createObjectURL.mock.calls[0][0]

    expect(blob).toBeInstanceOf(Blob)
    expect(await blob.text()).toBe("content")
    expect(blob.type).toBe("text/markdown")

    expect(anchor.href).toBe(objectUrl)
    expect(anchor.download).toBe("quicklog.md")
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl)
  })
})

describe("readJsonFile", () => {
  it("JSON ファイルの内容を parse する", async () => {
    const file = new File(
      [JSON.stringify({ id: "id1", text: "text1", createdAt: "2026-05-22T00:00:00.000Z" })],
      "data.json",
      { type: "application/json" },
    )

    await expect(readJsonFile(file)).resolves.toEqual({
      id: "id1",
      text: "text1",
      createdAt: "2026-05-22T00:00:00.000Z",
    })
  })

  it("JSON として不正な内容なら reject する", async () => {
    const file = new File(["invalid json"], "data.json", {
      type: "application/json",
    })

    await expect(readJsonFile(file)).rejects.toThrow()
  })
})
