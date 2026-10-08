import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StatCard({ label, value, hint, icon: Icon, tone = "default", className }: { label: string; value: string; hint?: string; icon?: LucideIcon; tone?: "default" | "accent" | "dark"; className?: string }) {
  return (
    <div className={cn("rounded-lg border p-5 shadow-soft", tone === "dark" ? "border-charcoal bg-charcoal text-ivory" : tone === "accent" ? "border-copper/30 bg-copper/5" : "border-charcoal/10 bg-white", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", tone === "dark" ? "text-sand-300" : "text-stone")}>{label}</p>
        {Icon ? <Icon className={cn("size-4", tone === "dark" ? "text-sand-300" : "text-copper")} /> : null}
      </div>
      <p className="num mt-3 font-display text-3xl sm:text-4xl">{value}</p>
      {hint ? <p className={cn("mt-1 text-xs", tone === "dark" ? "text-ivory/60" : "text-muted-foreground")}>{hint}</p> : null}
    </div>
  );
}
