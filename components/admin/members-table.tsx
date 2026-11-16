"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "cn";
import { toast } from "sonner";
import { updateMember } from "@/app/actions/admin";
import type { MemberPatch } from "@/lib/admin";
import type { Department, Profile } from "@/lib/types";

export type Member = Profile;

export function MembersTable({
  members,
  departments,
  currentUserId,
}: {
  members: Member[];
  departments: Department[];
  currentUserId: string;
}) {
  const [optimisticMembers, applyPatch] = useOptimistic(
    members,
    (state, change: { id: string; patch: MemberPatch }) =>
      state.map((m) => (m.id === change.id ? { ...m, ...change.patch } : m)),
  );
  const [, startTransition] = useTransition();

  function change(member: Member, patch: MemberPatch, success: string) {
    startTransition(async () => {
      applyPatch({ id: member.id, patch });
      const result = await updateMember(member.id, patch);
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium">Üyeler ({members.length})</h2>
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ad</th>
              <th className="px-4 py-2 font-medium">Departman</th>
              <th className="px-4 py-2 text-center font-medium">Admin</th>
              <th className="px-4 py-2 text-center font-medium">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {optimisticMembers.map((m) => (
              <tr key={m.id} data-testid={`member-${m.full_name}`} className={cn(!m.is_active && "bg-zinc-50 text-zinc-400")}>
                <td className="px-4 py-2.5">
                  {m.full_name}
                  {m.id === currentUserId && <span className="ml-1.5 text-xs text-zinc-400">(sen)</span>}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    aria-label={`${m.full_name} departmanı`}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={m.department_id ?? ""}
                    onChange={(e) => {
                      const name = departments.find((d) => d.id === e.target.value)?.name;
                      change(m, { department_id: e.target.value }, `${m.full_name}: departman ${name} olarak güncellendi.`);
                    }}
                  >
                    {m.department_id === null && <option value="">—</option>}
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${m.full_name} admin`}
                    className="size-4 accent-primary"
                    checked={m.is_admin}
                    onChange={(e) =>
                      change(
                        m,
                        { is_admin: e.target.checked },
                        e.target.checked ? `${m.full_name} artık admin.` : `${m.full_name} artık admin değil.`,
                      )
                    }
                  />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${m.full_name} aktif`}
                    className="size-4 accent-primary"
                    checked={m.is_active}
                    onChange={(e) => {
                      if (
                        !e.target.checked &&
                        !window.confirm(`${m.full_name} pasif yapılsın mı? Uygulamaya giriş yapamayacak.`)
                      ) {
                        return;
                      }
                      change(
                        m,
                        { is_active: e.target.checked },
                        e.target.checked ? `${m.full_name} yeniden aktif.` : `${m.full_name} pasif yapıldı.`,
                      );
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Pasif üyeler giriş yapamaz; eski görevlerinde adları görünmeye devam eder.
      </p>
    </section>
  );
}
