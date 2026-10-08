import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({ icon: Icon, title, body, action, className }: { icon?: LucideIcon; title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-charcoal/20 bg-white/60 px-6 py-14 text-center", className)}>
      {Icon ? <Icon className="mb-4 size-8 text-sand-400" strokeWidth={1.5} /> : null}
      <p className="font-display text-xl text-charcoal">{title}</p>
      {body ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
