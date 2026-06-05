import type { LogEntry } from "@/types"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type LogEntryRow = {
  id: string
  user_id: string
  body: string
  client_created_at: string
  created_at: string
  updated_at: string
}

function toLogEntry(row: LogEntryRow): LogEntry {
  return {
    id: row.id,
    text: row.body,
    createdAt: row.client_created_at,
  }
}

function toLogEntryRow(entry: LogEntry, user: User): Omit<LogEntryRow, "created_at" | "updated_at"> {
  return {
    id: entry.id,
    user_id: user.id,
    body: entry.text,
    client_created_at: entry.createdAt,
  }
}

export async function fetchCloudLogEntries(user: User): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from("log_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("client_created_at", { ascending: false })

  if (error) throw error

  return data.map(toLogEntry)
}

export async function upsertCloudLogEntry(entry: LogEntry, user: User): Promise<void> {
  const row = toLogEntryRow(entry, user)

  const { error } = await supabase
    .from("log_entries")
    .upsert(row, { onConflict: "id" })

  if (error) throw error
}

export async function upsertCloudLogEntries(entries: LogEntry[], user: User): Promise<void> {
  if (entries.length === 0) return

  const rows = entries.map((entry) => toLogEntryRow(entry, user))

  const { error } = await supabase
    .from("log_entries")
    .upsert(rows, { onConflict: "id" })

  if (error) throw error
}
