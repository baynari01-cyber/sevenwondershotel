"use client";
import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

/** A labelled switch laid out as a pill, RTL-safe. */
export function SwitchField({ id, label, hint, checked, onCheckedChange, disabled, className }: { id: string; label: string; hint?: string; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-md border border-charcoal/10 bg-ivory-soft/60 px-3.5 py-2.5", className)}>
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer leading-tight">{label}</Label>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/** Section eyebrow used inside long forms/dialogs. */
export function FormSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  );
}

/** Table shell shared by the catalogue lists. */
export function DataTable({ children, minWidth = 720, className }: { children: React.ReactNode; minWidth?: number; className?: string }) {
  return (
    <div className={cn("relative overflow-x-auto rounded-lg border border-charcoal/10 bg-white shadow-soft", className)}>
      <table className="w-full text-sm" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export function Th({ children, className, align = "start" }: { children?: React.ReactNode; className?: string; align?: "start" | "end" | "center" }) {
  return <th scope="col" className={cn("px-4 py-3 font-semibold", align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start", className)}>{children}</th>;
}

export function Td({ children, className, align = "start" }: { children?: React.ReactNode; className?: string; align?: "start" | "end" | "center" }) {
  return <td className={cn("px-4 py-3 align-middle", align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start", className)}>{children}</td>;
}

export const theadClass = "bg-ivory-soft text-xs uppercase tracking-wider text-stone";
