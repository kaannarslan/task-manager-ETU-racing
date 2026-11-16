"use client";

import { useTransition } from "react";
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { regenerateInviteCode } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function InviteCodeCard({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Davet kodu kopyalandı.");
    } catch {
      toast.error("Kopyalanamadı; kodu elle seçip kopyalayın.");
    }
  }

  function regenerate() {
    if (!window.confirm("Yeni bir davet kodu oluşturulsun mu? Eski kod artık çalışmayacak.")) return;
    startTransition(async () => {
      const result = await regenerateInviteCode();
      if (result.ok) toast.success("Yeni davet kodu oluşturuldu.");
      else toast.error(result.error);
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 p-4">
      <h2 className="text-sm font-medium">Davet kodu</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Yeni üyeler kayıt olurken bu kodu girer. Kod sızarsa yenileyin.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code data-testid="invite-code" className="rounded-md bg-zinc-100 px-3 py-1.5 font-mono text-sm">
          {code}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <CopyIcon /> Kopyala
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={regenerate} disabled={pending}>
          <RefreshCwIcon /> {pending ? "Yenileniyor…" : "Yenile"}
        </Button>
      </div>
    </section>
  );
}
