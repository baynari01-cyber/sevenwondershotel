"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ReservationFiltersBar({ q, status, source, from, to, sort, statuses, sources }: { q: string; status: string; source: string; from: string; to: string; sort: string; statuses: string[]; sources: string[] }) {
  const t = useTranslations("admin.reservations");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tso = useTranslations("source");
  const router = useRouter();
  const pathname = usePathname();
  const [form, setForm] = React.useState({ q, status, source, from, to, sort });

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const n = new URLSearchParams();
    if (form.q) n.set("q", form.q);
    if (form.status !== "ALL") n.set("status", form.status);
    if (form.source !== "ALL") n.set("source", form.source);
    if (form.from) n.set("from", form.from);
    if (form.to) n.set("to", form.to);
    if (form.sort !== "createdAt") n.set("sort", form.sort);
    router.replace(`${pathname}${n.toString() ? `?${n}` : ""}`);
  }

  return (
    <form onSubmit={apply} className="grid gap-3 rounded-lg border border-charcoal/10 bg-white p-4 shadow-soft md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-end">
      <label className="text-xs font-semibold uppercase tracking-wider text-stone md:col-span-1">
        <span className="mb-1.5 block">{tc("search")}</span>
        <div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-stone" /><Input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder={t("search")} className="ps-9" /></div>
      </label>
      <label className="text-xs font-semibold uppercase tracking-wider text-stone"><span className="mb-1.5 block">{t("status")}</span>
        <NativeSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ALL">{tc("all")}</option>{statuses.map((s) => <option key={s} value={s}>{ts(s as "PENDING")}</option>)}</NativeSelect></label>
      <label className="text-xs font-semibold uppercase tracking-wider text-stone"><span className="mb-1.5 block">{t("source")}</span>
        <NativeSelect value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}><option value="ALL">{tc("all")}</option>{sources.map((s) => <option key={s} value={s}>{tso(s as "WEBSITE")}</option>)}</NativeSelect></label>
      <label className="text-xs font-semibold uppercase tracking-wider text-stone"><span className="mb-1.5 block">{t("arrivalFrom")}</span><Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label>
      <label className="text-xs font-semibold uppercase tracking-wider text-stone"><span className="mb-1.5 block">{t("arrivalTo")}</span><Input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
      <div className="flex gap-2">
        <Button type="submit" variant="primary">{tc("filter")}</Button>
        <Button type="button" variant="ghost" onClick={() => { setForm({ q: "", status: "ALL", source: "ALL", from: "", to: "", sort: "createdAt" }); router.replace(pathname); }}>{tc("clear")}</Button>
      </div>
    </form>
  );
}
