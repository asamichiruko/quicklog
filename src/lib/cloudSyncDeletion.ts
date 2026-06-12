import { CloudSyncDeletionError } from "@/lib/errors"
import type { QuicklogData } from "@/types"

export async function deleteCloudSyncData(options: {
  loadAnonymousData: () => QuicklogData
  loadUserData: () => QuicklogData
  saveAnonymousData: (data: QuicklogData) => void
  clearUserData: () => void
  deleteCurrentAccount: () => Promise<void>
  clearLocalAuthSession: () => Promise<void>
  onLocalAuthSessionClearError?: (error: unknown) => void
}): Promise<void> {
  const anonymousData = options.loadAnonymousData()
  if (anonymousData.logEntries.length > 0 || anonymousData.logEntryDeletions.length > 0) {
    throw new CloudSyncDeletionError("この端末に匿名データが残っているため、クラウド同期アカウントを削除できません。先にローカルデータの管理から匿名データを削除してください")
  }

  const userData = options.loadUserData()
  try {
    options.saveAnonymousData(userData)
  } catch {
    throw new CloudSyncDeletionError("この端末に記録を保存できないため、削除を開始できませんでした")
  }

  try {
    await options.deleteCurrentAccount()
  } catch {
    options.saveAnonymousData(anonymousData)
    throw new CloudSyncDeletionError("クラウド同期アカウントを削除できませんでした")
  }

  options.clearUserData()
  try {
    await options.clearLocalAuthSession()
  } catch (error) {
    options.onLocalAuthSessionClearError?.(error)
  }
}
