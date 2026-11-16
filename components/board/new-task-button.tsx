"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" onClick={onClick}>
      <PlusIcon /> Yeni görev
    </Button>
  );
}
