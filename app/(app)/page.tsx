import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Home: the member's own department board, else the first department.
export default async function HomePage() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, slug")
    .order("name");

  const own = departments?.find((d) => d.id === user.department_id);
  const target = own ?? departments?.[0];
  if (!target) return <p className="p-6 text-sm text-zinc-600">Henüz departman yok.</p>;
  redirect(`/board/${target.slug}`);
}
