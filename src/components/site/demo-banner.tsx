import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";

export async function DemoBanner() {
  const t = await getTranslations("common");
  return (
    <div className="no-print bg-charcoal text-ivory" role="note">
      <div className="container-x flex items-center gap-3 py-2 text-xs">
        <Sparkles className="size-3.5 shrink-0 text-sand-300" />
        <p className="truncate">
          <span className="me-2 rounded-sm bg-copper px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t("demoBadge")}</span>
          {t("demoNotice")}
        </p>
      </div>
    </div>
  );
}
