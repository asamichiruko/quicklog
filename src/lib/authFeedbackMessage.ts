import { CloudSyncStartError } from "@/lib/errors"

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  email_not_confirmed: "メールアドレスの確認が完了していません。メールをご確認ください",
  email_exists: "登録できませんでした。入力内容を確認してください",
  user_already_exists: "登録できませんでした。入力内容を確認してください",
  weak_password: "パスワードが条件を満たしていません",
  signup_disabled: "現在、メールアドレスでの新規登録は利用できません",
  email_provider_disabled: "現在、メールアドレスでの新規登録は利用できません",
  over_request_rate_limit: "試行回数が多すぎます。しばらく待ってから再度お試しください",
  over_email_send_rate_limit: "メール送信回数が多すぎます。しばらく待ってから再度お試しください",
  request_timeout: "タイムアウトしました。通信状況を確認して再度お試しください",
  unexpected_failure: "認証サービスで問題が発生しました。時間をおいて再度お試しください",
}

function getAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined
  }

  const maybeError = error as { code?: unknown }

  return typeof maybeError.code === "string" ? maybeError.code : undefined
}

export function getAuthFeedbackMessage(error: unknown): string {
  if (error instanceof CloudSyncStartError) return error.message

  const code = getAuthErrorCode(error)

  if (code !== undefined && AUTH_ERROR_MESSAGES[code] !== undefined) {
    return AUTH_ERROR_MESSAGES[code]
  }

  if (import.meta.env.DEV) {
    console.warn("Unhandled auth error:", error)
  }

  return "認証処理に失敗しました。時間をおいて再度お試しください"
}
