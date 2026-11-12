"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordReset } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types";

// Two modes: ask for an e-mail (default), or set a new password when the
// user arrived through the recovery link in that e-mail.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      sendPasswordReset(formData),
    null,
  );

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setUpdateError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSaving(false);
    if (error) {
      setUpdateError("Şifre güncellenemedi: " + error.message);
    } else {
      router.push("/");
    }
  }

  if (recoveryMode) {
    return (
      <form onSubmit={updatePassword} className="space-y-4">
        <h1 className="text-lg font-semibold">Yeni şifre belirle</h1>
        <div className="space-y-2">
          <Label htmlFor="new_password">Yeni şifre</Label>
          <Input
            id="new_password"
            type="password"
            minLength={6}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        {updateError && (
          <p className="text-sm text-destructive">{updateError}</p>
        )}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Kaydediliyor…" : "Şifreyi güncelle"}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Şifre sıfırlama</h1>
      <p className="text-sm text-muted-foreground">
        E-posta adresini gir; sana bir sıfırlama bağlantısı gönderelim.
      </p>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {state?.ok && (
        <p className="text-sm text-muted-foreground">
          Bu adrese kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi.
        </p>
      )}
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Gönderiliyor…" : "Bağlantı gönder"}
      </Button>
    </form>
  );
}
