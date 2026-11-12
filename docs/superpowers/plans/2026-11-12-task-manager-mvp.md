# TOBB ETÜ Racing Yönetim Paneli — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Department-based kanban task tracker for a ~40-person Formula Student team, with invite-code auth, admin/member roles, task attachments, and a handover-friendly codebase.

**Architecture:** Server-first Next.js App Router: pages read data in Server Components, all writes go through Server Actions in `app/actions/`. Authorization lives in a pure, unit-tested `lib/permissions.ts` module used by the actions; Supabase RLS repeats the same rules as a second lock. Supabase Realtime triggers `router.refresh()` on the board.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, @dnd-kit, Supabase (@supabase/ssr + supabase-js, Postgres, Auth, Storage, Realtime), Vitest (dev only), Vercel.

**Spec:** `docs/superpowers/specs/2026-11-12-task-manager-design.md`

## Global Constraints

- Runtime dependencies limited to: Next.js, React, Tailwind, shadcn/ui (and its Radix peers), `@dnd-kit/core` + `@dnd-kit/sortable`, `@supabase/supabase-js`, `@supabase/ssr`. Dev-only: Vitest, ESLint, TypeScript. **No other dependencies** (no zod, no react-hook-form; forms validate in server actions).
- UI copy is **Turkish**; code, schema, comments, commit messages are **English**.
- Everything must run on Supabase + Vercel **free tier**. File uploads limited to **5 MB**.
- Task statuses, exactly: `todo | in_progress | blocked | done` (Postgres enum `task_status`). Turkish column labels: Yapılacak, Devam Ediyor, Blokeli, Tamamlandı.
- Board's done column shows only tasks completed in the **last 30 days**.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only; used **only** in the signup action's invite-code check). All three documented in `.env.example`.
- Departments, exactly 4, seeded: Mekanik (`mekanik`), Elektrik (`elektrik`), Yazılım (`yazilim`), Organizasyon (`organizasyon`).
- Theme (Notion-inspired, pinned here): background white / `zinc-50`, text `zinc-900`, subtle `zinc-200` borders, accent racing red `#DC2626`, font Inter via `next/font`. Dark mode is out of scope.

## Review Focus

Failure modes the spec implies; each is pinned to a test/verification in the owning task:

1. Wrong invite code at signup must create **no account** and show "Davet kodu hatalı." → Task 3 verification.
2. A deactivated member must not reach any app page (session or no session) → Task 3 layout check, verified in Task 9.
3. A file over 5 MB (or an invalid URL as link) must return a readable Turkish error and leave the task intact → Task 5 unit tests + Task 7 verification.
4. Dragging a card you may not edit must be blocked in UI **and** rejected by the action → Task 4 unit tests + Task 6 verification.
5. Tasks with null assignee and/or null deadline must render everywhere and sort sanely (null deadlines last) → Task 4 + Task 8 unit tests.

---

### Task 1: Scaffold — Next.js + Tailwind + shadcn/ui + Vitest

**Files:**
- Create: Next.js app at repo root (`create-next-app`: TypeScript, Tailwind, App Router, ESLint, no src dir, import alias `@/*`)
- Create: `.env.example`, `vitest.config.ts`, `lib/utils.test.ts`
- Modify: `app/layout.tsx` (Inter font, `lang="tr"`, metadata title "TOBB ETÜ Racing Yönetim Paneli"), `app/globals.css` (theme tokens from Global Constraints)

**Interfaces:**
- Produces: working `npm run dev`, `npm run build`, `npm test` (Vitest), shadcn `components/ui/*` ready to add.

- [ ] **Step 1: Scaffold the app**

Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` (flags may need `--yes`; repo already has docs/ — scaffold must not overwrite it). Then `npx shadcn@latest init` with the pinned theme (neutral zinc base), and add the components used later: `npx shadcn@latest add button input label select dialog dropdown-menu badge card sonner textarea`.

- [ ] **Step 2: Install and configure Vitest**

`npm i -D vitest`. `vitest.config.ts` with `@` alias matching tsconfig. Add `"test": "vitest run"` script.

- [ ] **Step 3: Write a smoke test** — `lib/utils.test.ts` asserting shadcn's `cn("a", false && "b") === "a"`.

- [ ] **Step 4: Run checks** — `npm test` → PASS; `npm run build` → success.

- [ ] **Step 5: Create `.env.example`** with the three env var names and a comment pointing to README setup.

- [ ] **Step 6: Commit** — `chore: scaffold Next.js app with Tailwind, shadcn/ui, Vitest`

---

### Task 2: Database schema, RLS, seed, shared types

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_rls.sql`, `supabase/seed.sql`
- Create: `lib/types.ts`
- Test: manual apply to the Supabase project

**Interfaces:**
- Produces (SQL): tables `departments(id uuid pk, name text, slug text unique)`, `app_settings(id int pk check (id = 1), invite_code text not null)`, `profiles(id uuid pk references auth.users on delete cascade, full_name text not null, department_id uuid references departments, is_admin bool default false, is_active bool default true, created_at timestamptz default now())`, `tasks(id uuid pk default gen_random_uuid(), title text not null, description text, department_id uuid not null references departments, assignee_id uuid references profiles, status task_status not null default 'todo', deadline date, completed_at timestamptz, created_by uuid references profiles, created_at timestamptz default now(), updated_at timestamptz default now())`, `attachments(id uuid pk default gen_random_uuid(), task_id uuid not null references tasks on delete cascade, kind text not null check (kind in ('file','link')), url text not null, display_name text not null, created_by uuid references profiles, created_at timestamptz default now())`.
- Produces (TS, `lib/types.ts`): `type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'`; `interface Profile { id: string; full_name: string; department_id: string | null; is_admin: boolean; is_active: boolean }`; `interface Task { id: string; title: string; description: string | null; department_id: string; assignee_id: string | null; status: TaskStatus; deadline: string | null; completed_at: string | null; created_by: string | null }`; `interface Department { id: string; name: string; slug: string }`; `interface Attachment { id: string; task_id: string; kind: 'file' | 'link'; url: string; display_name: string }`; `type ActionResult = { ok: true } | { ok: false; error: string }`.

- [ ] **Step 1: Write `0001_schema.sql`** — enum, tables above, plus:
  - Trigger `on_auth_user_created`: after insert on `auth.users`, insert into `profiles` using `raw_user_meta_data->>'full_name'` and `->>'department_id'` (security definer).
  - Trigger `set_first_admin`: before insert on `profiles`, if `profiles` is empty, set `new.is_admin := true`.
  - Trigger `track_completed_at`: before update on `tasks`, status → `done` sets `completed_at = now()`; leaving `done` nulls it; also sets `updated_at = now()` on any update.
  - Enable Realtime: `alter publication supabase_realtime add table tasks;`
  - Private storage bucket `attachments` (5 MB file size limit) via `insert into storage.buckets`.

- [ ] **Step 2: Write `0002_rls.sql`** — enable RLS on all five tables. Helper functions (security definer, stable): `is_active_member()`, `is_admin()`, `my_department_id()` reading `profiles` by `auth.uid()`. Policies mirroring the spec:
  - all tables SELECT: `is_active_member()` (`app_settings` SELECT/UPDATE: `is_admin()` only)
  - `tasks` INSERT: `is_active_member()`; UPDATE: `is_admin() or department_id = my_department_id() or assignee_id = auth.uid()`; DELETE: `is_admin()`
  - `attachments` INSERT/DELETE: same rule as the parent task's UPDATE (via `exists` subquery on `tasks`)
  - `profiles` UPDATE: own row (`full_name` only — enforce via trigger or column check) or `is_admin()`
  - `storage.objects` for bucket `attachments`: INSERT/SELECT for authenticated active members.

- [ ] **Step 3: Write `seed.sql`** — 4 departments from Global Constraints; `app_settings` row with invite code `'RACING-2027'` and a comment telling the installer to change it from the admin panel.

- [ ] **Step 4: Write `lib/types.ts`** exactly as the Interfaces block above, plus `const STATUS_LABELS: Record<TaskStatus, string>` with the Turkish labels and `const STATUSES: TaskStatus[]` in column order.

- [ ] **Step 5: Apply and verify** — `npx supabase init` (if needed), link or start the project (`supabase start` with Docker, else `supabase link` + `supabase db push`), apply seed. Expected: tables visible, 4 departments, settings row present. Record the chosen path for the README.

- [ ] **Step 6: Commit** — `feat: add database schema, RLS policies, and seed`

---

### Task 3: Supabase glue + auth (register, login, logout, route protection)

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/admin.ts`, `middleware.ts`
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/actions/auth.ts`
- Create: `lib/auth.ts` (`getCurrentProfile()`)

**Interfaces:**
- Consumes: `lib/types.ts` (Task 2).
- Produces: `createClient()` (server, cookie-based) in `lib/supabase/server.ts`; `createClient()` (browser) in `client.ts`; `createAdminClient()` (service role, server-only) in `admin.ts`; `getCurrentProfile(): Promise<Profile | null>` returning null for anonymous **or inactive** users; actions `signUp(formData: FormData): Promise<ActionResult>`, `signIn(formData: FormData): Promise<ActionResult>`, `signOut(): Promise<void>`.

- [ ] **Step 1: Write the Supabase clients** following the official `@supabase/ssr` App Router pattern (`npm i @supabase/supabase-js @supabase/ssr`). `middleware.ts` refreshes the session and redirects: unauthenticated → `/login` (except `/login`, `/register`), authenticated visiting auth pages → `/`.

- [ ] **Step 2: Write `app/actions/auth.ts`**:
  - `signUp`: reads `email, password, full_name, department_id, invite_code` from FormData; validates presence (Turkish errors); compares `invite_code` against `app_settings` via `createAdminClient()` — mismatch returns `{ ok: false, error: 'Davet kodu hatalı.' }` **before** any auth call; on match calls `auth.signUp` with `full_name`/`department_id` in metadata, then redirects to `/`.
  - `signIn`: `auth.signInWithPassword`, wrong credentials → `'E-posta veya şifre hatalı.'`; then redirect `/`.
  - `signOut`: sign out + redirect `/login`.
  - `getCurrentProfile()` in `lib/auth.ts`: session user → their `profiles` row; returns null if no session or `is_active = false` (signs the inactive user out).

- [ ] **Step 3: Build the two auth pages** — centered card, team name header, shadcn inputs; register has a department `<select>` (server-fetched) and invite code field; forms post to the actions, errors render under the form. Add "Şifremi unuttum" link on login using `auth.resetPasswordForEmail` (Supabase built-in email) with a minimal `/reset-password` page.

- [ ] **Step 4: Verify manually** (dev server + Supabase): (a) register with wrong code → error, **no user row created**; (b) register with `RACING-2027` → lands on `/`, profile row exists, first user has `is_admin = true`; (c) logout → `/login`; (d) visiting `/` logged out → redirected.

- [ ] **Step 5: Run `npm run build`** → success. Commit — `feat: add auth with invite code, session middleware, and route protection`

---

### Task 4: Permissions module (pure, TDD)

**Files:**
- Create: `lib/permissions.ts`
- Test: `lib/permissions.test.ts`

**Interfaces:**
- Consumes: `Profile`, `Task` from `lib/types.ts`.
- Produces: `canEditTask(user: Profile, task: Pick<Task, 'department_id' | 'assignee_id'>): boolean`; `canDeleteTask(user: Profile): boolean`; `canManageTeam(user: Profile): boolean`; `sortByDeadline<T extends { deadline: string | null }>(tasks: T[]): T[]` (ascending, nulls last, stable).

- [ ] **Step 1: Write failing tests** covering: admin edits anything; member edits own-department task; member edits task assigned to them in another department; member **cannot** edit other-department task not assigned to them; task with `assignee_id: null` editable only by its department's members and admins; inactive user can edit nothing; only admins delete/manage; `sortByDeadline` puts nulls last and keeps date order.

- [ ] **Step 2: Run `npm test`** → FAIL (module not found).

- [ ] **Step 3: Implement `lib/permissions.ts`** — pure functions, no imports beyond types.

- [ ] **Step 4: Run `npm test`** → PASS. Commit — `feat: add pure permissions module`

---

### Task 5: Task & attachment server actions

**Files:**
- Create: `app/actions/tasks.ts`, `app/actions/attachments.ts`, `lib/validation.ts`
- Test: `lib/validation.test.ts`

**Interfaces:**
- Consumes: `getCurrentProfile()` (Task 3), permissions (Task 4), types (Task 2).
- Produces:
  - `createTask(input: { title: string; description?: string; department_id: string; assignee_id?: string | null; deadline?: string | null }): Promise<ActionResult>`
  - `updateTask(taskId: string, patch: Partial<Pick<Task, 'title' | 'description' | 'assignee_id' | 'deadline' | 'status'>>): Promise<ActionResult>`
  - `moveTask(taskId: string, status: TaskStatus): Promise<ActionResult>`
  - `deleteTask(taskId: string): Promise<ActionResult>`
  - `addFileAttachment(taskId: string, formData: FormData): Promise<ActionResult>` (field `file`)
  - `addLinkAttachment(taskId: string, input: { url: string; display_name: string }): Promise<ActionResult>`
  - `removeAttachment(attachmentId: string): Promise<ActionResult>`
  - `lib/validation.ts`: `validateFileSize(bytes: number): string | null` (> 5 MB → Turkish error, else null); `validateUrl(url: string): string | null` (http/https only).

- [ ] **Step 1: Write failing tests** for `validateFileSize` (exactly 5 MB ok, 5 MB + 1 byte rejected) and `validateUrl` (`https://` ok, `javascript:` and garbage rejected). Run → FAIL.

- [ ] **Step 2: Implement `lib/validation.ts`**; run → PASS.

- [ ] **Step 3: Implement the actions.** Every action: `getCurrentProfile()` → null returns `'Oturum bulunamadı.'`; fetch the task; check with the permissions module → `'Bu görevi düzenleme yetkiniz yok.'` / `'Silme yetkisi yalnız adminlerde.'`; mutate via the **user's** server client (RLS stays second lock); `revalidatePath` the board and `/my-tasks`. Files upload to `attachments/{taskId}/{timestamp}-{filename}` then insert the row; attachment URLs for `kind: 'file'` store the storage path (signed URLs generated at render).

- [ ] **Step 4: `npm run build`** → success. Commit — `feat: add task and attachment server actions`

---

### Task 6: Kanban board page with drag & drop

**Files:**
- Create: `app/(app)/layout.tsx` (app shell: top nav — team name, department links, Görevlerim, Admin if `canManageTeam`, user menu with logout)
- Create: `app/(app)/page.tsx` (redirect to own department's board, else first department)
- Create: `app/(app)/board/[slug]/page.tsx`, `components/board/board.tsx`, `components/board/column.tsx`, `components/board/task-card.tsx`
- Modify: `lib/types.ts` (add `TaskWithAssignee`)

**Interfaces:**
- Consumes: `moveTask` (Task 5), permissions (Task 4), `getCurrentProfile` (Task 3).
- Produces: `<Board tasks={TaskWithAssignee[]} profiles={Profile[]} departmentId={string} currentUser={Profile} />` client component; `TaskWithAssignee = Task & { assignee: Pick<Profile, 'id' | 'full_name'> | null }` (exported from `lib/types.ts`).

- [ ] **Step 1: Build the board page** (Server Component): fetch department by slug (404 → `notFound()`), its tasks joined with assignee name, filtered: `status != 'done' OR completed_at > now() - 30 days`; order via `sortByDeadline` per column. Render `<Board>`.

- [ ] **Step 2: Build the kanban UI** (`npm i @dnd-kit/core @dnd-kit/sortable`): 4 fixed columns (labels from `STATUS_LABELS`), cards show title, assignee name or "Atanmamış", deadline badge (red when past due), department-neutral Notion-like styling. Drag enabled only when `canEditTask(currentUser, task)`; drop → optimistic column move + `moveTask` call; on `{ ok: false }` show sonner toast with the error and revert.

- [ ] **Step 3: Verify manually**: switch departments via nav; drag own task across columns (persists after reload); as a non-admin, a card from another department not assigned to you shows no drag affordance; forcing the action (e.g., second browser as the other user) returns the Turkish error toast.

- [ ] **Step 4: `npm run build`** → success. Commit — `feat: add department kanban board with drag and drop`

---

### Task 7: Task dialog (create/edit + attachments)

**Files:**
- Create: `components/board/task-dialog.tsx`, `components/board/new-task-button.tsx`
- Modify: `components/board/board.tsx`, `components/board/task-card.tsx` (open dialog on click)

**Interfaces:**
- Consumes: all Task 5 actions; `TaskWithAssignee`; attachments fetched server-side and passed through the board (`Task` rows come with `attachments: Attachment[]`).
- Produces: `<TaskDialog task={TaskWithAssignee | null} ... />` — `null` task = create mode (board's department preselected).

- [ ] **Step 1: Build the dialog** — fields: title (required), description (textarea), assignee (`<select>` of **active** members, any department, "Atanmamış" option), deadline (`<input type="date">`, clearable), status select. Read-only view when `canEditTask` is false. Footer: save; delete button only when `canDeleteTask`. Attachments section: list (file names link via signed URL, links open in new tab), remove buttons (edit rights), "Dosya ekle" (file input, client-side size pre-check + server check) and "Link ekle" (url + name inputs).

- [ ] **Step 2: Verify manually**: create a task on **another department's** board (allowed per spec); edit; upload a small PDF and open it; add a Drive link; try a 6 MB file → Turkish error, task intact; delete as admin; confirm non-admin sees no delete.

- [ ] **Step 3: `npm run build`** → success. Commit — `feat: add task dialog with attachments`

---

### Task 8: Görevlerim (My Tasks) page

**Files:**
- Create: `app/(app)/my-tasks/page.tsx`, `components/my-tasks-list.tsx`

**Interfaces:**
- Consumes: `sortByDeadline` (Task 4), `TaskDialog` (Task 7).

- [ ] **Step 1: Build the page**: all non-done tasks (plus done from last 30 days, grouped last) where `assignee_id = me`, across all departments, sorted by `sortByDeadline`; each row: title, department badge, status label, deadline (overdue in red). Row click opens `TaskDialog`.

- [ ] **Step 2: Verify manually**: assign yourself tasks in two departments → both appear; null-deadline task listed last; empty state shows "Sana atanmış görev yok. 🎉".

- [ ] **Step 3: `npm run build`** → success. Commit — `feat: add my-tasks page`

---

### Task 9: Admin panel

**Files:**
- Create: `app/(app)/admin/page.tsx`, `components/admin/members-table.tsx`, `components/admin/invite-code-card.tsx`, `app/actions/admin.ts`

**Interfaces:**
- Consumes: `canManageTeam` (Task 4), `getCurrentProfile` (Task 3).
- Produces: `updateMember(profileId: string, patch: { department_id?: string; is_admin?: boolean; is_active?: boolean }): Promise<ActionResult>`; `regenerateInviteCode(): Promise<ActionResult>` (new code: `RACING-` + 6 random uppercase alphanumerics).

- [ ] **Step 1: Implement `app/actions/admin.ts`** — both actions gate on `canManageTeam`, mutate via user client (RLS admin policies back them). `updateMember` refuses self-demotion when it would leave zero active admins (count check → `'Son admini yetkisiz bırakamazsınız.'`).

- [ ] **Step 2: Build the page** — guard: non-admin → `redirect('/')`. Invite code card: current code, copy button, "Yenile" with confirm. Members table: name, department select, admin toggle, active toggle; changes call `updateMember` with toast feedback.

- [ ] **Step 3: Verify manually**: change a member's department → their board edit rights follow; deactivate a test user → they are signed out / cannot log in ("Hesabınız pasif durumda."), their name still shows on old tasks; regenerate code → old code rejected at signup, new accepted; last-admin demotion blocked.

- [ ] **Step 4: `npm run build`** → success. Commit — `feat: add admin panel`

---

### Task 10: Realtime, README, deploy readiness

**Files:**
- Create: `components/board/board-realtime.tsx`, `README.md`
- Modify: `app/(app)/board/[slug]/page.tsx`

**Interfaces:**
- Consumes: browser client (Task 3).
- Produces: `<BoardRealtime departmentId={string} />` — subscribes to `postgres_changes` on `tasks` filtered by `department_id`, calls `router.refresh()` on any event; unsubscribes on unmount.

- [ ] **Step 1: Implement and mount `BoardRealtime`** on the board page.

- [ ] **Step 2: Verify manually**: two browser windows on the same board; moving a card in one updates the other within ~2 s without interaction.

- [ ] **Step 3: Write `README.md`** (in Turkish — its audience is the next maintainer): what the app is; architecture in 10 lines (where logic lives: `app/actions/` + `lib/permissions.ts`, RLS as second lock); zero-to-running setup (Supabase project creation, **disabling email confirmation** in Supabase Auth settings, `supabase link` + `db push`, seed, env vars, first user = admin, changing the invite code); Vercel deploy steps; free-tier limits (1 GB storage, 5 MB uploads, big files as Drive links); handover checklist (make successor admin, transfer Supabase/Vercel/GitHub access); "gelecek fikirleri" (department document archive / Drive integration, per spec).

- [ ] **Step 4: Full check** — `npm test`, `npm run lint`, `npm run build` all pass. Commit — `feat: add realtime board updates and maintainer README`

---

## Self-review notes

- Spec coverage: invite-code auth (T3), roles & bootstrap (T2 triggers, T3, T9), boards/kanban/fixed columns (T6), task fields incl. nullable assignee/deadline (T2, T7), cross-department create & assignment (T5/T7), attachments file+link with 5 MB limit (T5/T7), Görevlerim (T8), admin panel incl. deactivation + invite code (T9), realtime (T10), 30-day done window (T2 trigger + T6 query), handover README (T10). Drive integration & document archive: explicitly out of scope per spec.
- Review Focus items are each pinned: 1→T3.4, 2→T3.2/T9.3, 3→T5.1/T7.2, 4→T4.1/T6.3, 5→T4.1/T8.2.
