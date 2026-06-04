revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

create table public.log_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  client_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete
on table public.log_entries
to authenticated;

create index log_entries_user_id_client_created_at_idx
on public.log_entries (user_id, client_created_at desc);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_log_entries_updated_at
before update on public.log_entries
for each row
execute function public.update_updated_at_column();

alter table public.log_entries enable row level security;

create policy "Users can select their own log entries"
on public.log_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own log entries"
on public.log_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own log entries"
on public.log_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own log entries"
on public.log_entries
for delete
to authenticated
using (auth.uid() = user_id);
