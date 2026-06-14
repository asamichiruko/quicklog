import { describe, expect, it } from "vitest"
import { SchemaValidationError } from "@/errors"
import { parseAsDataScope } from "./dataScopeSchema"

describe("parseAsDataScope", () => {
  it("anonymous scope を parse できる", () => {
    expect(parseAsDataScope({ type: "anonymous" })).toEqual({ type: "anonymous" })
  })

  it("user scope を parse できる", () => {
    expect(parseAsDataScope({ type: "user", userId: "user-id" })).toEqual({
      type: "user",
      userId: "user-id",
    })
  })

  it("不正な値に対して例外を出す", () => {
    expect(() => parseAsDataScope(null)).toThrow(SchemaValidationError)
    expect(() => parseAsDataScope({ type: "authenticated", userId: "user-id" })).toThrow(
      SchemaValidationError,
    )
    expect(() => parseAsDataScope({ type: "user" })).toThrow(SchemaValidationError)
    expect(() => parseAsDataScope({ type: "user", userId: "" })).toThrow(SchemaValidationError)
    expect(() => parseAsDataScope({ type: "user", userId: "a".repeat(129) })).toThrow(
      SchemaValidationError,
    )
  })
})
