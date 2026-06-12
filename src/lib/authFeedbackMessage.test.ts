import { describe, expect, it } from "vitest"
import { getAuthFeedbackMessage } from "./authFeedbackMessage"
import { CloudSyncDeletionError, CloudSyncStartError } from "@/lib/errors"

describe("getAuthFeedbackMessage", () => {
  it("CloudSyncStartError object からメッセージを取り出す", () => {
    expect(getAuthFeedbackMessage(new CloudSyncStartError("CloudSyncStartError"))).toBe("CloudSyncStartError")
  })

  it("CloudSyncDeletionError object からメッセージを取り出す", () => {
    expect(getAuthFeedbackMessage(new CloudSyncDeletionError("CloudSyncDeletionError"))).toBe("CloudSyncDeletionError")
  })

  it("invalid_credentials を日本語のメッセージに変換する", () => {
    expect(getAuthFeedbackMessage({ code: "invalid_credentials" })).toBe("メールアドレスまたはパスワードが正しくありません")
  })

  it("unknown code は汎用メッセージに変換する", () => {
    expect(getAuthFeedbackMessage({ code: "dummy_error" })).toBe("認証処理に失敗しました。時間をおいて再度お試しください")
  })

  it("Error object を汎用メッセージに変換する", () => {
    expect(getAuthFeedbackMessage(new Error("Network error"))).toBe("認証処理に失敗しました。時間をおいて再度お試しください")
  })
})
