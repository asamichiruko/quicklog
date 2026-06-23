import { CloudSyncDeletionError, CloudSyncActivationError } from "@/errors"

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
  opt_expired:
    "確認コードの有効期限が切れました。確認メールを再送して、新しいコードを入力してください",
  same_password: "現在のパスワードとは異なるパスワードを設定してください",
  session_expired: "セッションの有効期限が切れました。もう一度サインインしてください",
  flow_state_expired: "認証手続きの有効期限が切れました。もう一度やり直してください",
  bad_code_verifier: "認証手続きの確認に失敗しました。最初からやり直してください",
  reauthentication_needed: "安全のため、もう一度サインインしてください",
  reauthentication_not_valid: "安全のため、もう一度サインインしてください",
  reauth_nonce_missing: "安全のため、もう一度サインインしてください",
}

function getAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined
  }

  const maybeError = error as { code?: unknown }

  return typeof maybeError.code === "string" ? maybeError.code : undefined
}

export function getAuthFeedbackMessage(error: unknown): string {
  if (error instanceof CloudSyncActivationError) return error.message
  if (error instanceof CloudSyncDeletionError) return error.message

  const code = getAuthErrorCode(error)

  if (code !== undefined && AUTH_ERROR_MESSAGES[code] !== undefined) {
    return AUTH_ERROR_MESSAGES[code]
  }

  if (import.meta.env.DEV) {
    console.warn("Unhandled auth error:", error)
  }

  return "認証処理に失敗しました。時間をおいて再度お試しください"
}
