import type { Session, User } from "@supabase/supabase-js"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  changePassword,
  clearLocalAuthSession,
  deleteCurrentAccount,
  getCurrentSession,
  getCurrentUser,
  sendPasswordResetCode,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePasswordAfterRecovery,
  verifyPasswordResetCode,
} from "./auth"

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
      getUser: supabaseMocks.getUser,
      signUp: supabaseMocks.signUp,
      signInWithPassword: supabaseMocks.signInWithPassword,
      signOut: supabaseMocks.signOut,
      resetPasswordForEmail: supabaseMocks.resetPasswordForEmail,
      verifyOtp: supabaseMocks.verifyOtp,
      updateUser: supabaseMocks.updateUser,
    },
    functions: {
      invoke: supabaseMocks.invoke,
    },
  },
}))

describe("auth", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("現在の session を取得する", async () => {
    const session = { user: { id: "user-id" } } as unknown as Session
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })

    await expect(getCurrentSession()).resolves.toBe(session)

    expect(supabaseMocks.getSession).toHaveBeenCalledOnce()
  })

  it("session 取得時に error があれば throw する", async () => {
    const error = new Error("getSession failed")
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null }, error })

    await expect(getCurrentSession()).rejects.toThrow(error)
  })

  it("現在の user を取得する", async () => {
    const user = { id: "user-id" } as unknown as User
    supabaseMocks.getUser.mockResolvedValue({ data: { user }, error: null })

    await expect(getCurrentUser()).resolves.toBe(user)

    expect(supabaseMocks.getUser).toHaveBeenCalledOnce()
  })

  it("user 取得時に error があれば throw する", async () => {
    const error = new Error("getUser failed")
    supabaseMocks.getUser.mockResolvedValue({ data: { user: null }, error })

    await expect(getCurrentUser()).rejects.toThrow(error)
  })

  it("メールアドレスとパスワードでアカウントを作成する", async () => {
    supabaseMocks.signUp.mockResolvedValue({ error: null })

    await expect(signUpWithEmail("user@example.com", "Passw0rd!")).resolves.toBeUndefined()

    expect(supabaseMocks.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Passw0rd!",
    })
  })

  it("アカウント作成時に error があれば throw する", async () => {
    const error = new Error("signUp failed")
    supabaseMocks.signUp.mockResolvedValue({ error })

    await expect(signUpWithEmail("user@example.com", "Passw0rd!")).rejects.toThrow(error)
  })

  it("メールアドレスとパスワードでサインインする", async () => {
    supabaseMocks.signInWithPassword.mockResolvedValue({ error: null })

    await expect(signInWithEmail("user@example.com", "Passw0rd!")).resolves.toBeUndefined()

    expect(supabaseMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Passw0rd!",
    })
  })

  it("サインイン時に error があれば throw する", async () => {
    const error = new Error("signIn failed")
    supabaseMocks.signInWithPassword.mockResolvedValue({ error })

    await expect(signInWithEmail("user@example.com", "Passw0rd!")).rejects.toThrow(error)
  })

  it("サインアウトする", async () => {
    supabaseMocks.signOut.mockResolvedValue({ error: null })

    await expect(signOut()).resolves.toBeUndefined()

    expect(supabaseMocks.signOut).toHaveBeenCalledWith()
  })

  it("サインアウト時に error があれば throw する", async () => {
    const error = new Error("signOut failed")
    supabaseMocks.signOut.mockResolvedValue({ error })

    await expect(signOut()).rejects.toThrow(error)
  })

  it("ローカル auth session だけを破棄する", async () => {
    supabaseMocks.signOut.mockResolvedValue({ error: null })

    await expect(clearLocalAuthSession()).resolves.toBeUndefined()

    expect(supabaseMocks.signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it("ローカル auth session 破棄時に error があれば throw する", async () => {
    const error = new Error("local signOut failed")
    supabaseMocks.signOut.mockResolvedValue({ error })

    await expect(clearLocalAuthSession()).rejects.toThrow(error)
  })

  it("delete-account function を呼んで現在のアカウントを削除する", async () => {
    supabaseMocks.invoke.mockResolvedValue({ data: { success: true }, error: null })

    await expect(deleteCurrentAccount()).resolves.toBeUndefined()

    expect(supabaseMocks.invoke).toHaveBeenCalledWith("delete-account", { method: "POST" })
  })

  it("アカウント削除 function が error を返したら throw する", async () => {
    const error = new Error("delete account failed")
    supabaseMocks.invoke.mockResolvedValue({ data: null, error })

    await expect(deleteCurrentAccount()).rejects.toThrow(error)
  })

  it("アカウント削除 function の応答が success でなければ throw する", async () => {
    supabaseMocks.invoke.mockResolvedValue({ data: { success: false }, error: null })

    await expect(deleteCurrentAccount()).rejects.toThrow("アカウントを削除できませんでした")
  })

  it("パスワードリセット用コードを送信する", async () => {
    supabaseMocks.resetPasswordForEmail.mockResolvedValue({ error: null })

    await expect(sendPasswordResetCode("user@example.com")).resolves.toBeUndefined()

    expect(supabaseMocks.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com")
  })

  it("パスワードリセット用コード送信時に error があれば throw する", async () => {
    const error = new Error("reset password failed")
    supabaseMocks.resetPasswordForEmail.mockResolvedValue({ error })

    await expect(sendPasswordResetCode("user@example.com")).rejects.toThrow(error)
  })

  it("パスワードリセット用 OTP を検証する", async () => {
    const session = { user: { id: "user-id" } } as unknown as Session
    supabaseMocks.verifyOtp.mockResolvedValue({ data: { session }, error: null })

    await expect(verifyPasswordResetCode("user@example.com", "123456")).resolves.toBeUndefined()

    expect(supabaseMocks.verifyOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      token: "123456",
      type: "recovery",
    })
  })

  it("パスワードリセット用 OTP 検証時に error があれば throw する", async () => {
    const error = new Error("verify otp failed")
    supabaseMocks.verifyOtp.mockResolvedValue({ data: { session: null }, error })

    await expect(verifyPasswordResetCode("user@example.com", "123456")).rejects.toThrow(error)
  })

  it("パスワードリセット用 OTP 検証後に session がなければ throw する", async () => {
    supabaseMocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: null })

    await expect(verifyPasswordResetCode("user@example.com", "123456")).rejects.toThrow(
      "パスワードリセット用のセッションを開始できませんでした",
    )
  })

  it("recovery session のパスワードを更新する", async () => {
    supabaseMocks.updateUser.mockResolvedValue({ error: null })

    await expect(updatePasswordAfterRecovery("NewPassw0rd!")).resolves.toBeUndefined()

    expect(supabaseMocks.updateUser).toHaveBeenCalledWith({ password: "NewPassw0rd!" })
  })

  it("recovery session のパスワード更新時に error があれば throw する", async () => {
    const error = new Error("update password failed")
    supabaseMocks.updateUser.mockResolvedValue({ error })

    await expect(updatePasswordAfterRecovery("NewPassw0rd!")).rejects.toThrow(error)
  })

  it("現在のパスワード付きでパスワードを変更する", async () => {
    supabaseMocks.updateUser.mockResolvedValue({ error: null })

    await expect(changePassword("NewPassw0rd!", "CurrentPassw0rd!")).resolves.toBeUndefined()

    expect(supabaseMocks.updateUser).toHaveBeenCalledWith({
      password: "NewPassw0rd!",
      current_password: "CurrentPassw0rd!",
    })
  })

  it("パスワード変更時に error があれば throw する", async () => {
    const error = new Error("change password failed")
    supabaseMocks.updateUser.mockResolvedValue({ error })

    await expect(changePassword("NewPassw0rd!")).rejects.toThrow(error)
  })
})
