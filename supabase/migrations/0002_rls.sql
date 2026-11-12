-- Row Level Security: the database-level second lock.
-- The same rules live in lib/permissions.ts and app/actions/* (first lock).

-- Helper functions (security definer so they can read profiles under RLS).
create function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_active
  );
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_active and is_admin
  );
$$;

create function public.my_department_id() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid() and is_active;
$$;

alter table departments enable row level security;
alter table app_settings enable row level security;
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table attachments enable row level security;

-- departments: readable by members; managed only via migrations/seed.
create policy departments_select on departments
  for select using (public.is_active_member());

-- app_settings: invite code is admin-only. The signup action reads it with
-- the service role key (bypasses RLS) before the user exists.
create policy app_settings_select on app_settings
  for select using (public.is_admin());
create policy app_settings_update on app_settings
  for update using (public.is_admin());

-- profiles: everyone reads; self or admin updates. A trigger below keeps
-- non-admins from touching role fields.
create policy profiles_select on profiles
  for select using (public.is_active_member());
create policy profiles_update on profiles
  for update using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

create function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for direct DB access (seed, dashboard SQL): allow.
  if auth.uid() is not null and not public.is_admin() and (
    new.is_admin is distinct from old.is_admin
    or new.is_active is distinct from old.is_active
    or new.department_id is distinct from old.department_id
  ) then
    raise exception 'only admins may change role fields';
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on profiles
  for each row execute function public.protect_profile_columns();

-- Non-admins may edit tasks they're allowed to touch, but may not move
-- them to another board or rewrite authorship.
create function public.protect_task_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for direct DB access (seed, dashboard SQL): allow.
  if auth.uid() is not null and not public.is_admin() and (
    new.department_id is distinct from old.department_id
    or new.created_by is distinct from old.created_by
  ) then
    raise exception 'only admins may change a task''s department or creator';
  end if;
  return new;
end;
$$;

create trigger protect_task_columns
  before update on tasks
  for each row execute function public.protect_task_columns();

-- tasks: everyone reads; anyone may create on any board (spec decision);
-- update = admin, own department, or assignee; delete = admin only.
create policy tasks_select on tasks
  for select using (public.is_active_member());
create policy tasks_insert on tasks
  for insert with check (public.is_active_member() and created_by = auth.uid());
create policy tasks_update on tasks
  for update using (
    public.is_admin()
    or (public.is_active_member()
        and (department_id = public.my_department_id() or assignee_id = auth.uid()))
  )
  with check (
    public.is_admin()
    or (public.is_active_member()
        and (department_id = public.my_department_id() or assignee_id = auth.uid()))
  );
create policy tasks_delete on tasks
  for delete using (public.is_admin());

-- attachments: readable by members; add/remove follows the parent task's
-- update rule.
create policy attachments_select on attachments
  for select using (public.is_active_member());
create policy attachments_insert on attachments
  for insert with check (
    public.is_active_member() and exists (
      select 1 from tasks t
      where t.id = task_id
        and (public.is_admin()
             or t.department_id = public.my_department_id()
             or t.assignee_id = auth.uid())
    )
  );
create policy attachments_delete on attachments
  for delete using (
    public.is_active_member() and exists (
      select 1 from tasks t
      where t.id = task_id
        and (public.is_admin()
             or t.department_id = public.my_department_id()
             or t.assignee_id = auth.uid())
    )
  );

-- storage: objects live under "<task_id>/<filename>", so write access
-- follows the parent task's edit rule; reads stay team-wide (spec).
create function public.can_modify_task_attachments(object_path text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tasks t
    where t.id::text = (storage.foldername(object_path))[1]
      and (public.is_admin()
           or t.department_id = public.my_department_id()
           or t.assignee_id = auth.uid())
  );
$$;

create policy attachments_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_active_member()
    and public.can_modify_task_attachments(name)
  );
create policy attachments_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and public.is_active_member());
create policy attachments_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_active_member()
    and public.can_modify_task_attachments(name)
  );
