"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // The invite code is validated ONLY by the database trigger
  // (handle_new_user): routing every attempt through auth.signUp keeps
  // Supabase's built-in rate limiting in front of code guesses.
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
    // The trigger rejects bad invite codes; GoTrue relays its message.
    if (
      error.message.includes("invalid invite code") ||
      error.message.toLowerCase().includes("database error")
    ) {
      return { ok: false, error: "Davet kodu hatalı." };
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "E-posta veya şifre hatalı." };
  }

  // Deactivated members can still authenticate; refuse them here with a
  // clear message (RLS hides an inactive member's own profile row).
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Hesabınız pasif durumda." };
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
