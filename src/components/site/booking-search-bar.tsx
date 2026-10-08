"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Users } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { addDays, todayIso } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export function BookingSearchBar({ className, variant = "floating", childAgeLimit = 12, maxRooms = 5 }: { className?: string; variant?: "floating" | "inline"; childAgeLimit?: number; maxRooms?: number }) {
  const t = useTranslations("booking.search");
  const tc = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const today = todayIso();
  const [checkIn, setCheckIn] = React.useState(addDays(today, 7));
  const [checkOut, setCheckOut] = React.useState(addDays(today, 9));
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [rooms, setRooms] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const te = useTranslations("booking.errors");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checkIn < today) return setError(te("checkInPast"));
    if (checkOut <= checkIn) return setError(te("checkOutAfter"));
    setError(null);
    const params = new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children), rooms: String(rooms) });
    router.push(`/book?${params.toString()}`);
  }

  const floating = variant === "floating";

  return (
    <form
      onSubmit={submit}
      aria-label={t("title")}
      className={cn(
        "grid gap-3 rounded-lg bg-white p-4 text-charcoal shadow-lift sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_0.9fr_0.9fr_0.8fr_auto] lg:items-end",
        floating && "border border-charcoal/5",
        className,
      )}
    >
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t("checkIn")}</span>
        <Input type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} lang={locale} required />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t("checkOut")}</span>
        <Input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} lang={locale} required />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 flex items-center gap-1.5"><Users className="size-3.5" />{t("adults")}</span>
        <NativeSelect value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{tc("adults", { count: n })}</option>)}
        </NativeSelect>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 block">{t("children")}</span>
        <NativeSelect value={children} onChange={(e) => setChildren(Number(e.target.value))} aria-describedby="children-hint">
          {Array.from({ length: 5 }, (_, i) => i).map((n) => <option key={n} value={n}>{tc("children", { count: n })}</option>)}
        </NativeSelect>
        <span id="children-hint" className="sr-only">{t("childrenHint", { age: childAgeLimit })}</span>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
        <span className="mb-1.5 block">{t("roomsCount")}</span>
        <NativeSelect value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>
          {Array.from({ length: maxRooms }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{tc("rooms", { count: n })}</option>)}
        </NativeSelect>
      </label>
      <Button type="submit" variant="accent" size="md" className="h-11 w-full lg:w-auto">{t("submit")}</Button>
      {error ? <p role="alert" className="text-xs text-danger sm:col-span-2 lg:col-span-6">{error}</p> : null}
    </form>
  );
}
