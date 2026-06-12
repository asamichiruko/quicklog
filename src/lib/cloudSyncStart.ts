import { CloudSyncStartError, isQuotaExceededError, SizeError } from "@/lib/errors"
import type { User } from "@supabase/supabase-js"

export async function startCloudSync(options: {
  authenticate: () => Promise<void>
  reloadAuthState: () => Promise<void>
  getActiveUser: () => User | null
  moveAnonymousDataToUser: (user: User) => void | Promise<void>
  rollback: () => Promise<void>
}) {
  await options.authenticate()

  try {
    await options.reloadAuthState()

    const user = options.getActiveUser()
    if (!user) {
      throw new CloudSyncStartError(
        "サインイン状態を確認できませんでした。時間をおいて再度お試しください",
      )
    }

    await options.moveAnonymousDataToUser(user)
  } catch (error) {
    await options.rollback()

    if (error instanceof CloudSyncStartError) {
      throw error
    }

    throw createCloudSyncStartError(error)
  }
}

function createCloudSyncStartError(error: unknown) {
  if (error instanceof SizeError) {
    return new CloudSyncStartError("記録が多すぎるため、クラウド同期を開始できませんでした")
  }

  if (isQuotaExceededError(error)) {
    return new CloudSyncStartError(
      "ブラウザの保存領域が不足しているため、クラウド同期を開始できませんでした",
    )
  }

  return new CloudSyncStartError("クラウド同期を開始できませんでした")
}
