import { describe, expect, it } from "vitest"
import {
  validateEmail,
  validateRequiredPassword,
  validateCreatedPassword,
  validateVerificationCode,
} from "./authFormValidation"

describe("validateEmail", () => {
  it("正しい形式のメールアドレスに対して空文字を返す", () => {
    expect(validateEmail("example@example.com")).toBe("")
  })

  it("空文字に対してエラーメッセージを返す", () => {
    expect(validateEmail("")).toBe("メールアドレスを入力してください")
  })

  it("誤った形式のメールアドレスに対してエラーメッセージを返す", () => {
    expect(validateEmail("invalid email")).toBe("正しい形式のメールアドレスを入力してください")
  })

  it("長すぎるメールアドレスに対してエラーメッセージを返す", () => {
    expect(validateEmail(`${"a".repeat(64)}@${"a".repeat(64)}.com`)).toBe(
      "正しい形式のメールアドレスを入力してください",
    )
  })
})

describe("validateRequiredPassword", () => {
  it("任意の 1 文字以上のパスワードに対して空文字を返す", () => {
    expect(validateRequiredPassword("password1")).toBe("")
  })

  it("空文字に対してエラーメッセージを返す", () => {
    expect(validateRequiredPassword("")).toBe("パスワードを入力してください")
  })
})

describe("validateCreatedPassword", () => {
  it("条件を満たすパスワードに対して空文字を返す", () => {
    expect(validateCreatedPassword("Passw0rd!")).toBe("")
  })

  it("空文字に対してエラーメッセージを返す", () => {
    expect(validateCreatedPassword("")).toBe("パスワードを入力してください")
  })

  it("8 文字未満のパスワードに対してエラーメッセージを返す", () => {
    expect(validateCreatedPassword("passwd")).toBe("パスワードは 8 文字以上で作成してください")
    expect(validateCreatedPassword("Pswd0!")).toBe("パスワードは 8 文字以上で作成してください")
  })

  it("英大文字を含まないパスワードに対してエラーメッセージを返す", () => {
    expect(validateCreatedPassword("passw0rd!")).toBe(
      "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください",
    )
  })

  it("英小文字を含まないパスワードに対してエラーメッセージを返す", () => {
    expect(validateCreatedPassword("PASSW0RD!")).toBe(
      "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください",
    )
  })

  it("数字を含まないパスワードに対してエラーメッセージを返す", () => {
    expect(validateCreatedPassword("Password!")).toBe(
      "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください",
    )
  })

  it("記号を含まないパスワードに対してエラーメッセージを返す", () => {
    expect(validateCreatedPassword("Passw0rd")).toBe(
      "パスワードには英小文字・英大文字・数字・記号を各 1 文字以上含めてください",
    )
  })

  it("空の認証コードに対してエラーメッセージを返す", () => {
    expect(validateVerificationCode("")).toBe("確認コードを入力してください")
  })

  it("条件を満たす認証コードに対して空文字を返す", () => {
    expect(validateVerificationCode("123456")).toBe("")
  })

  it("6 文字未満の認証コードに対してエラーメッセージを返す", () => {
    expect(validateVerificationCode("12345")).toBe("確認コードは 6 文字で入力してください")
  })

  it("6 文字を超えるの認証コードに対してエラーメッセージを返す", () => {
    expect(validateVerificationCode("1234567")).toBe("確認コードは 6 文字で入力してください")
  })
})
