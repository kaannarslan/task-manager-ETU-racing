import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { AppNav } from "@/components/nav/app-nav";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentProfile } from "@/lib/auth";
import { canManageTeam } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Second gate after the middleware: also catches deactivated members,
  // whose session is still valid but whose profile is no longer active.
  const user = await getCurrentProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug")
    .order("name");

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-6 px-4">
          <div className="shrink-0 text-sm font-bold tracking-tight">
            TOBB ETÜ <span className="text-primary">Racing</span>
          </div>
          <AppNav
            departments={(departments ?? []) as Department[]}
            showAdmin={canManageTeam(user)}
          />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-zinc-600 sm:inline">{user.full_name}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Çıkış
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
