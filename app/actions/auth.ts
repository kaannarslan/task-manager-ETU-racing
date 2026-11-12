"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  if (!email || !password || !fullName || !departmentId || !inviteCode) {
    return { ok: false, error: "Lütfen tüm alanları doldurun." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Şifre en az 6 karakter olmalı." };
  }

  // Friendly pre-check. The database trigger enforces the same rule, so a
  // direct API call with a wrong code fails there too.
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("app_settings")
    .select("invite_code")
    .eq("id", 1)
    .maybeSingle();
  if (!settings || settings.invite_code !== inviteCode) {
    return { ok: false, error: "Davet kodu hatalı." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        department_id: departmentId,
        invite_code: inviteCode,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { ok: false, error: "Bu e-posta ile zaten bir hesap var." };
    }
    return { ok: false, error: "Kayıt başarısız: " + error.message };
  }
  redirect("/");
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "E-posta ve şifre gerekli." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "E-posta veya şifre hatalı." };
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function sendPasswordReset(
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "E-posta adresi gerekli." };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  // Always report success: don't leak which emails exist.
  return { ok: true };
}
