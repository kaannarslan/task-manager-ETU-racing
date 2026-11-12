"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult, Department } from "@/lib/types";

export function RegisterForm({ departments }: { departments: Department[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => signUp(formData),
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Takıma katıl</h1>
      <div className="space-y-2">
        <Label htmlFor="invite_code">Takım davet kodu</Label>
        <Input id="invite_code" name="invite_code" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Ad Soyad</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department_id">Departman</Label>
        <Select name="department_id" required>
          <SelectTrigger id="department_id" className="w-full">
            <SelectValue placeholder="Departmanını seç" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Kayıt yapılıyor…" : "Kayıt ol"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="hover:text-foreground underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
