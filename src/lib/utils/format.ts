import type { AppLocale } from "@/i18n/routing";

export type Localized<T extends string> = Record<`${T}En` | `${T}Ar`, string>;

/** Picks the localized variant of a bilingual field pair (nameEn / nameAr). */
export function pickLocale<T extends string>(record: Partial<Record<`${T}En` | `${T}Ar`, string | null>>, field: T, locale: string): string {
  const ar = record[`${field}Ar` as `${T}Ar`];
  const en = record[`${field}En` as `${T}En`];
  if (locale === "ar") return (ar && ar.trim()) || en || "";
  return (en && en.trim()) || ar || "";
}

const CURRENCY_LOCALES: Record<string, string> = { en: "en-JO", ar: "ar-JO" };

export function formatMoney(amount: string | number, currency = "JOD", locale: string = "en", options?: { compact?: boolean }): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const formatter = new Intl.NumberFormat(CURRENCY_LOCALES[locale] ?? "en-JO", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: options?.compact ? 0 : 2,
    maximumFractionDigits: options?.compact ? 0 : 2,
    numberingSystem: "latn",
  });
  // "JOD 65.00" → keep code visible but normalise spacing for both locales.
  return formatter.format(Number.isFinite(value) ? value : 0).replace(/ /g, " ");
}

export function convertMoney(amountJod: string | number, target: "JOD" | "USD" | "EUR", rates: { usdRate: string | number; eurRate: string | number }): number {
  const value = Number(amountJod);
  if (target === "USD") return value * Number(rates.usdRate);
  if (target === "EUR") return value * Number(rates.eurRate);
  return value;
}

export function formatDate(iso: string | Date, locale: string = "en", style: "short" | "medium" | "long" | "weekday" = "medium"): string {
  const date = typeof iso === "string" ? new Date(`${iso.slice(0, 10)}T12:00:00Z`) : iso;
  const loc = locale === "ar" ? "ar-JO" : "en-GB";
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "long"
        ? { day: "numeric", month: "long", year: "numeric" }
        : style === "weekday"
          ? { weekday: "short", day: "numeric", month: "short" }
          : { day: "numeric", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat(loc, { ...opts, timeZone: "UTC", numberingSystem: "latn" }).format(date);
}

export function formatDateTime(date: Date, locale: string = "en"): string {
  const loc = locale === "ar" ? "ar-JO" : "en-GB";
  return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Amman", numberingSystem: "latn" }).format(date);
}

export function formatPercent(value: number, locale: string = "en", digits = 0): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", { style: "percent", maximumFractionDigits: digits, numberingSystem: "latn" }).format(value);
}

export function formatNumber(value: number, locale: string = "en", digits = 0): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", { maximumFractionDigits: digits, numberingSystem: "latn" }).format(value);
}

export function isAppLocaleString(locale: string): locale is AppLocale {
  return locale === "en" || locale === "ar";
}
