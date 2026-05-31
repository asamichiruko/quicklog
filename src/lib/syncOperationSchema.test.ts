import { describe, expect, it } from "vitest"
import { isValidSyncOperation, parseAsSyncOperations } from "./syncOperationSchema"
import { SchemaValidationError } from "@/lib/errors"

describe("isValidSyncOperation", () => {
  it("valid な SyncOperation を true と判定する", () => {
    const item = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }

    expect(isValidSyncOperation(item)).toBe(true)
  })

  it("object 型でないものを false と判定する", () => {
    expect(isValidSyncOperation(undefined)).toBe(false)
    expect(isValidSyncOperation(null)).toBe(false)
    expect(isValidSyncOperation([])).toBe(false)
    expect(isValidSyncOperation("invalid item")).toBe(false)
  })

  it("id が存在しない、または不正な値のとき false と判定する", () => {
    const item1 = {
      id: 42,
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }
    const item2 = {
      id: "",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }
    const item3 = {
      id: "a".repeat(1000),
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }
    const item4 = {
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }

    expect(isValidSyncOperation(item1)).toBe(false)
    expect(isValidSyncOperation(item2)).toBe(false)
    expect(isValidSyncOperation(item3)).toBe(false)
    expect(isValidSyncOperation(item4)).toBe(false)
  })

  it("type が存在しない、または不正な値のとき false と判定する", () => {
    const item1 = {
      id: "id1",
      type: "invalid-type",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }
    const item2 = {
      id: "id1",
      type: 42,
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }
    const item3 = {
      id: "id1",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "entryId1",
    }

    expect(isValidSyncOperation(item1)).toBe(false)
    expect(isValidSyncOperation(item2)).toBe(false)
    expect(isValidSyncOperation(item3)).toBe(false)
  })

  it("createdAt が存在しない、または invalid な date string であるとき false と判定する", () => {
    const item1 = {
      id: "id1",
      type: "delete",
      createdAt: "invalid date",
      entryId: "entryId1",
    }
    const item2 = {
      id: "id1",
      type: "delete",
      createdAt: new Date("2026-05-31T00:00:00.000Z"),
      entryId: "entryId1",
    }
    const item3 = {
      id: "id1",
      type: "delete",
      createdAt: "",
      entryId: "entryId1",
    }
    const item4 = {
      id: "id1",
      type: "delete",
      entryId: "entryId1",
    }
    expect(isValidSyncOperation(item1)).toBe(false)
    expect(isValidSyncOperation(item2)).toBe(false)
    expect(isValidSyncOperation(item3)).toBe(false)
    expect(isValidSyncOperation(item4)).toBe(false)
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

  it("type が delete であり、entryId が存在しない、または invalid な id string であるとき false を返す", () => {
    const item1 = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "",
    }
    const item2 = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: 42,
    }
    const item3 = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
      entryId: "a".repeat(1000),
    }
    const item4 = {
      id: "id1",
      type: "delete",
      createdAt: "2026-05-31T00:00:00.000Z",
    }

    expect(isValidSyncOperation(item1)).toBe(false)
    expect(isValidSyncOperation(item2)).toBe(false)
    expect(isValidSyncOperation(item3)).toBe(false)
    expect(isValidSyncOperation(item4)).toBe(false)
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
    const data = { name: "invalid object" }
    expect(() => { parseAsSyncOperations(data) }).toThrow(SchemaValidationError)
    expect(() => { parseAsSyncOperations(undefined) }).toThrow(SchemaValidationError)
    expect(() => { parseAsSyncOperations(null) }).toThrow(SchemaValidationError)
  })

  it("invalid な SyncOperation を含む配列に対して例外を出す", () => {
    const data = [{ name: "invalid data" }]
    expect(() => { parseAsSyncOperations(data) }).toThrow(SchemaValidationError)
  })

  it("空の配列をそのまま返す", () => {
    expect(parseAsSyncOperations([])).toEqual([])
  })
})
