"use server";

import { revalidatePath } from "next/cache";
import { generateInviteCode, removesLastAdmin, type MemberPatch } from "@/lib/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canManageTeam } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const NO_SESSION = "Oturum bulunamadı.";
const NOT_ADMIN = "Bu işlem yalnız adminlere açık.";
const SAVE_FAILED = "Değişiklik kaydedilemedi. Lütfen tekrar deneyin.";

export async function updateMember(profileId: string, patch: MemberPatch): Promise<ActionResult> {
  const user = await getCurrentProfile();
  if (!user) return { ok: false, error: NO_SESSION };
  if (!canManageTeam(user)) return { ok: false, error: NOT_ADMIN };

  // Client-controlled input: keep only the three editable fields.
  const clean: MemberPatch = {};
  if (patch.department_id !== undefined) clean.department_id = String(patch.department_id);
  if (patch.is_admin !== undefined) clean.is_admin = patch.is_admin === true;
  if (patch.is_active !== undefined) clean.is_active = patch.is_active === true;
  if (Object.keys(clean).length === 0) return { ok: true };

  const supabase = await createClient();
  const { data: members, error: readError } = await supabase
    .from("profiles")
    .select("id, is_admin, is_active");
  if (readError || !members) return { ok: false, error: SAVE_FAILED };
  if (!members.some((m) => m.id === profileId)) return { ok: false, error: "Üye bulunamadı." };
  if (removesLastAdmin(members, profileId, clean)) {
    return { ok: false, error: "Son admini yetkisiz bırakamazsınız." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(clean)
    .eq("id", profileId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: SAVE_FAILED };

  // Roles and departments affect every page (nav, edit rights).
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function regenerateInviteCode(): Promise<ActionResult> {
  const user = await getCurrentProfile();
  if (!user) return { ok: false, error: NO_SESSION };
  if (!canManageTeam(user)) return { ok: false, error: NOT_ADMIN };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ invite_code: generateInviteCode() })
    .eq("id", 1)
    .select("id");
  if (error || !data?.length) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/admin");
  return { ok: true };
}
