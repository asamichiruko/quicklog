const EMAIL_VALIDATION_REGEXP =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const PASSWORD_MIN_LENGTH = 8
const VERIFICATION_CODE_LENGTH = 6

export function validateEmail(value: string): string {
  const email = value.trim()
  if (!email) return "メールアドレスを入力してください"
  if (!EMAIL_VALIDATION_REGEXP.test(email)) return "正しい形式のメールアドレスを入力してください"
  return ""
}

export function validateRequiredPassword(value: string): string {
  if (!value) return "パスワードを入力してください"
  return ""
}

export function validateCreatedPassword(value: string): string {
  if (!value) return "パスワードを入力してください"
  if (value.length < PASSWORD_MIN_LENGTH)
    return `パスワードは ${PASSWORD_MIN_LENGTH} 文字以上で作成してください`
  if (
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[\!@#$%\^&\*\(\)_\+\-=\[\]\{\};':"|<>\?,\.\/`~\.]/.test(value)
  ) {
    return "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください"
  }
  return ""
}

export function validateVerificationCode(value: string): string {
  if (!value) return "確認コードを入力してください"
  if (value.length !== VERIFICATION_CODE_LENGTH)
    return `確認コードは ${VERIFICATION_CODE_LENGTH} 文字で入力してください`
  return ""
}
