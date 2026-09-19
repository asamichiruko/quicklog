import {
  CloudSyncActivationError as CloudSyncActivationError,
  isQuotaExceededError,
  SizeError,
} from "@/errors"
import type { Session, User } from "@supabase/supabase-js"

export async function activateCloudSync(options: {
  authenticate: () => Promise<void>
  loadAuthenticatedSession: () => Promise<Session | null>
  moveAnonymousDataToUser: (user: User) => void | Promise<void>
  commitAuthenticatedSession: (session: Session) => void
  rollback: () => Promise<void>
}) {
  await options.authenticate()

  try {
    const session = await options.loadAuthenticatedSession()

    if (!session) {
      throw new CloudSyncActivationError(
        "サインイン状態を確認できませんでした。時間をおいて再度お試しください",
      )
    }

    await options.moveAnonymousDataToUser(session.user)
    options.commitAuthenticatedSession(session)
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
