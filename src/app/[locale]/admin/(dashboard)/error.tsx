"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  const ta = useTranslations("admin");
  const forbidden = error.message === "FORBIDDEN";
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-charcoal/20 bg-white/60 px-6 py-20 text-center">
      <p className="font-display text-2xl">{forbidden ? ta("forbidden") : t("error")}</p>
      {!forbidden ? <Button className="mt-6" variant="outline" onClick={reset}>{t("retry")}</Button> : null}
    </div>
  );
}
