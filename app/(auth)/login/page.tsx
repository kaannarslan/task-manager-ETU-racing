"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => signIn(formData),
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Giriş yap</h1>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/register" className="hover:text-foreground">
          Kayıt ol
        </Link>
        <Link href="/reset-password" className="hover:text-foreground">
          Şifremi unuttum
        </Link>
      </div>
    </form>
  );
}
