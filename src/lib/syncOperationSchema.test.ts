import { describe, expect, it } from "vitest"
import { isValidSyncOperation, parseAsSyncOperations } from "./syncOperationSchema"
import { SchemaValidationError } from "@/lib/errors"

describe("isValidSyncOperation", () => {
  it("valid な SyncOperation を true と判定する", () => {
    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "id1",
    })).toBe(true)
  })

  it("object 型でないものを false と判定する", () => {
    expect(isValidSyncOperation(undefined)).toBe(false)
    expect(isValidSyncOperation(null)).toBe(false)
    expect(isValidSyncOperation([])).toBe(false)
    expect(isValidSyncOperation("invalid item")).toBe(false)
  })

  it("id が存在しない、または不正な型のとき false と判定する", () => {
    expect(isValidSyncOperation({
      id: 42,
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    })).toBe(false)

    expect(isValidSyncOperation({
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    })).toBe(false)
  })

  it("id は 1 文字以上 128 文字以下を valid, それ以外を invalid と判定する", () => {
    const itemBase = {
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "id1",
    }
    expect(isValidSyncOperation({ ...itemBase, id: "" })).toBe(false)
    expect(isValidSyncOperation({ ...itemBase, id: "a" })).toBe(true)
    expect(isValidSyncOperation({ ...itemBase, id: "a".repeat(128) })).toBe(true)
    expect(isValidSyncOperation({ ...itemBase, id: "a".repeat(129) })).toBe(false)
  })

  it("entryId は 1 文字以上 128 文字以下を valid, それ以外を invalid と判定する", () => {
    const itemBase = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
    }
    expect(isValidSyncOperation({ ...itemBase, entryId: "" })).toBe(false)
    expect(isValidSyncOperation({ ...itemBase, entryId: "a" })).toBe(true)
    expect(isValidSyncOperation({ ...itemBase, entryId: "a".repeat(128) })).toBe(true)
    expect(isValidSyncOperation({ ...itemBase, entryId: "a".repeat(129) })).toBe(false)
  })

  it("type が存在しない、または不正な値のとき false と判定する", () => {
    expect(isValidSyncOperation({
      id: "id1",
      type: "invalid-type",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    })).toBe(false)

    expect(isValidSyncOperation({
      id: "id1",
      type: 42,
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    })).toBe(false)

    expect(isValidSyncOperation({
      id: "id1",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    })).toBe(false)
  })

  it("createdAt が存在しない、または invalid な date string であるとき false と判定する", () => {
    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      createdAt: "invalid date",
      entryId: "entryId1",
    })).toBe(false)

    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      createdAt: new Date("2026-05-31T00:00:00.000Z"),
      entryId: "entryId1",
    })).toBe(false)

    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      createdAt: "",
      entryId: "entryId1",
    })).toBe(false)

    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      entryId: "entryId1",
    })).toBe(false)
  })

  it("object が余分なプロパティを持っているとき true と判定する", () => {
    const item = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
      unknownProperty: 42,
    }
    expect(isValidSyncOperation(item)).toBe(true)
  })

  it("type が delete であり、entryId が存在しない、または型が異なるとき false を返す", () => {
    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: 42,
    })).toBe(false)

    expect(isValidSyncOperation({
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
    })).toBe(false)
  })
})

describe("parseAsSyncOperations", () => {
  it("valid な SyncOperation[] をそのまま返す", () => {
    const data = [
      {
        id: "id1",
        type: "delete",
        createdAt: "2026-05-31T00:00:00.000Z",
        entryId: "entryId1",
      },
    ]

    const parsed = parseAsSyncOperations(data)
    expect(parsed).toEqual(data)
  })

  it("配列でない object に対して例外を出す", () => {
    expect(() => { parseAsSyncOperations({ name: "invalid object" }) }).toThrow(SchemaValidationError)
    expect(() => { parseAsSyncOperations(undefined) }).toThrow(SchemaValidationError)
    expect(() => { parseAsSyncOperations(null) }).toThrow(SchemaValidationError)
  })

  it("invalid な SyncOperation を含む配列に対して例外を出す", () => {
    expect(() => { parseAsSyncOperations([{ name: "invalid data" }]) }).toThrow(SchemaValidationError)
  })

  it("空の配列をそのまま返す", () => {
    expect(parseAsSyncOperations([])).toEqual([])
  })
})
