"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { Department } from "@/lib/types";

export function AppNav({
  departments,
  showAdmin,
}: {
  departments: Department[];
  showAdmin: boolean;
}) {
  const pathname = usePathname();

  const links = [
    ...departments.map((d) => ({ href: `/board/${d.slug}`, label: d.name })),
    { href: "/my-tasks", label: "Görevlerim" },
    ...(showAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-zinc-100 font-medium text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
