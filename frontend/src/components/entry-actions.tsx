import { Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function EntryActions({
  onEdit,
  onDelete,
  mobileExpense = false,
}: {
  onEdit: () => void;
  onDelete: (trigger: HTMLButtonElement) => void;
  mobileExpense?: boolean;
}) {
  const button = cn(
    "shrink-0 rounded-full grid place-items-center text-ink-3 hover:bg-white transition-colors",
    mobileExpense ? "size-11 border border-hairline bg-white/65" : "size-11 md:size-8",
  );
  return (
    <div className="flex gap-1.5 md:gap-1">
      <button
        type="button"
        aria-label={mobileExpense ? "Edit expense" : "Edit entry"}
        onClick={onEdit}
        className={cn(button, "hover:text-ink-1")}
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        aria-label={mobileExpense ? "Delete expense" : "Delete entry"}
        onClick={(event) => onDelete(event.currentTarget)}
        className={cn(button, "hover:text-critical")}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
