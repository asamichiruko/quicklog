import { CloudSyncActivationError as CloudSyncActivationError, isQuotaExceededError, SizeError } from "@/errors"
import type { User } from "@supabase/supabase-js"

export async function activateCloudSync(options: {
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
      throw new CloudSyncActivationError(
        "サインイン状態を確認できませんでした。時間をおいて再度お試しください",
      )
    }

    await options.moveAnonymousDataToUser(user)
  } catch (error) {
    await options.rollback()

    if (error instanceof CloudSyncActivationError) {
      throw error
    }

    throw createCloudSyncActivationError(error)
  }
}

function createCloudSyncActivationError(error: unknown) {
  if (error instanceof SizeError) {
    return new CloudSyncActivationError("記録が多すぎるため、クラウド同期を開始できませんでした")
  }

  if (isQuotaExceededError(error)) {
    return new CloudSyncActivationError(
      "ブラウザの保存領域が不足しているため、クラウド同期を開始できませんでした",
    )
  }

  return new CloudSyncActivationError("クラウド同期を開始できませんでした")
}
