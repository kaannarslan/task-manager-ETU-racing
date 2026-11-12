-- TOBB ETU Racing task manager: core schema.
-- Applied via `supabase db push` (or `supabase db reset` locally).

create type task_status as enum ('todo', 'in_progress', 'blocked', 'done');

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table app_settings (
  id int primary key check (id = 1),
  invite_code text not null
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  department_id uuid references departments,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department_id uuid not null references departments,
  assignee_id uuid references profiles,
  status task_status not null default 'todo',
  deadline date,
  completed_at timestamptz,
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_department_idx on tasks (department_id);
create index tasks_assignee_idx on tasks (assignee_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  kind text not null check (kind in ('file', 'link')),
  url text not null,
  display_name text not null,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

create index attachments_task_idx on attachments (task_id);

-- Create a profile row for every new auth user, from the signup metadata.
-- Also enforces the invite code at the database level: the signup API is
-- publicly callable with the anon key, so the server action's check alone
-- would be bypassable.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  valid_code text;
begin
  select invite_code into valid_code from public.app_settings where id = 1;
  if valid_code is null
     or new.raw_user_meta_data ->> 'invite_code' is distinct from valid_code then
    raise exception 'invalid invite code';
  end if;

  insert into public.profiles (id, full_name, department_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'İsimsiz Üye'),
    nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The very first member becomes admin (bootstrap; documented in README).
create function public.set_first_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles) then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

create trigger set_first_admin
  before insert on profiles
  for each row execute function public.set_first_admin();

-- Track updated_at, and stamp completed_at when a task enters 'done'
-- (the board only shows 'done' tasks from the last 30 days).
create function public.handle_task_update() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger on_task_update
  before update on tasks
  for each row execute function public.handle_task_update();

-- Realtime: the board subscribes to task changes.
alter publication supabase_realtime add table tasks;

-- Private storage bucket for task attachments (5 MB per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 5242880);
