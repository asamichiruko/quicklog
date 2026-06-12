import type { LogEntryDeletion } from "@/types"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { deleteCloudLogEntries, deleteCloudLogEntry } from "@/lib/logEntryRepository"

type LogEntryDeletionRow = {
  log_entry_id: string
  user_id: string
  created_at: string
}

function toLogEntryDeletion(row: LogEntryDeletionRow): LogEntryDeletion {
  return {
    logEntryId: row.log_entry_id,
    createdAt: row.created_at,
  }
}

function toLogEntryDeletionRow(deletion: LogEntryDeletion, user: User): LogEntryDeletionRow {
  return {
    log_entry_id: deletion.logEntryId,
    user_id: user.id,
    created_at: deletion.createdAt,
  }
}

export async function fetchCloudLogEntryDeletions(user: User): Promise<LogEntryDeletion[]> {
  const { data, error } = await supabase
    .from("log_entry_deletions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error

  return data.map(toLogEntryDeletion)
}

export async function upsertCloudLogEntryDeletion(
  deletion: LogEntryDeletion,
  user: User,
): Promise<void> {
  const row = toLogEntryDeletionRow(deletion, user)

  const { error } = await supabase
    .from("log_entry_deletions")
    .upsert(row, { onConflict: "log_entry_id" })

  if (error) throw error
}

export async function upsertCloudLogEntryDeletions(
  deletions: LogEntryDeletion[],
  user: User,
): Promise<void> {
  if (deletions.length === 0) return

  const rows = deletions.map((deletion) => toLogEntryDeletionRow(deletion, user))

  const { error } = await supabase
    .from("log_entry_deletions")
    .upsert(rows, { onConflict: "log_entry_id" })

  if (error) throw error
}

export async function recordLogEntryDeletion(
  deletion: LogEntryDeletion,
  user: User,
): Promise<void> {
  await upsertCloudLogEntryDeletion(deletion, user)
  await deleteCloudLogEntry(deletion.logEntryId, user)
}

export async function recordLogEntryDeletions(
  deletions: LogEntryDeletion[],
  user: User,
): Promise<void> {
  await upsertCloudLogEntryDeletions(deletions, user)
  await deleteCloudLogEntries(
    deletions.map((deletion) => deletion.logEntryId),
    user,
  )
}
