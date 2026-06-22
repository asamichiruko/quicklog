import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return data.user
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw error
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function clearLocalAuthSession(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error) {
    throw error
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  })

  if (error !== null) throw error

  if (typeof data !== "object" || data === null || data.success !== true) {
    throw new Error("アカウントを削除できませんでした")
  }
}

export async function sendPasswordResetCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    throw error
  }
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<void> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  })

  if (error) {
    throw error
  }

  if (!data.session) {
    throw new Error("パスワードリセット用のセッションを開始できませんでした")
  }
}

export async function updatePasswordAfterRecovery(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw error
  }
}

export async function changePassword(
  newPassword: string,
  currentPassword?: string,
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    ...(currentPassword ? { currentPassword } : {}),
  })

  if (error) {
    throw error
  }
}
