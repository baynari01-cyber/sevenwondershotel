"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function LocaleSwitcher({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const other = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    const query = searchParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: other });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      lang={other}
      dir={other === "ar" ? "rtl" : "ltr"}
      aria-label={`${t("language")}: ${other === "ar" ? t("arabic") : t("english")}`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold tracking-wide transition-colors",
        tone === "dark" ? "border-ivory/40 text-ivory hover:bg-ivory/10" : "border-charcoal/20 text-charcoal hover:bg-charcoal/5",
        className,
      )}
    >
      <span aria-hidden="true" className="text-[10px] uppercase opacity-70">{other}</span>
      <span className={other === "ar" ? "font-arabic" : "font-sans"}>{other === "ar" ? t("arabic") : t("english")}</span>
    </button>
  );
}
