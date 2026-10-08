"use client";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function RoomFilters({ guests, balcony, suites, sort }: { guests: number; balcony: boolean; suites: boolean; sort: string }) {
  const t = useTranslations("rooms");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "0" || v === "false") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  }

  const active = guests > 0 || balcony || suites || sort !== "recommended";

  return (
    <form className="flex flex-wrap items-end gap-4 rounded-lg border border-charcoal/10 bg-white p-4 shadow-soft" onSubmit={(e) => e.preventDefault()} aria-label={t("filters")}>
      <label className="text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 block">{t("guestsFilter")}</span>
        <NativeSelect value={guests} onChange={(e) => update({ guests: e.target.value })} className="h-10 min-w-36">
          <option value={0}>{tc("all")}</option>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{tc("guests", { count: n })}</option>)}
        </NativeSelect>
      </label>
      <label className="text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 block">{t("sortBy")}</span>
        <NativeSelect value={sort} onChange={(e) => update({ sort: e.target.value === "recommended" ? null : e.target.value })} className="h-10 min-w-40">
          <option value="recommended">{t("sortRecommended")}</option>
          <option value="price">{t("sortPrice")}</option>
          <option value="size">{t("sortSize")}</option>
        </NativeSelect>
      </label>
      <label className="flex h-10 items-center gap-2 text-sm">
        <Checkbox checked={balcony} onCheckedChange={(v) => update({ balcony: v === true ? "1" : null })} /> {t("balconyOnly")}
      </label>
      <label className="flex h-10 items-center gap-2 text-sm">
        <Checkbox checked={suites} onCheckedChange={(v) => update({ suites: v === true ? "1" : null })} /> {t("suitesOnly")}
      </label>
      {active ? <Button variant="ghost" size="sm" onClick={() => router.replace(pathname, { scroll: false })}>{t("resetFilters")}</Button> : null}
    </form>
  );
}
