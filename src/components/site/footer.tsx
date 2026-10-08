import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { SettingsDTO } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";

export async function SiteFooter({ settings }: { settings: SettingsDTO }) {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const year = new Date().getFullYear();

  const links = [
    { href: "/rooms", label: tn("rooms") },
    { href: "/experiences", label: tn("experiences") },
    { href: "/gallery", label: tn("gallery") },
    { href: "/about", label: tn("about") },
    { href: "/contact", label: tn("contact") },
    { href: "/book", label: tn("book") },
  ] as const;

  return (
    <footer className="relative mt-auto bg-charcoal text-ivory">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <p className="font-display text-2xl">{pickLocale(settings, "name", locale)}</p>
          <p className="text-sm text-ivory/70">{pickLocale(settings, "tagline", locale)}</p>
          <p className="text-xs text-sand-300">{t("familyHotel")}</p>
        </div>
        <div>
          <p className="eyebrow mb-4 text-sand-300">{t("address")}</p>
          <address className="space-y-2 text-sm not-italic text-ivory/80">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-sand-300" /> <span>{pickLocale(settings, "address", locale)}</span></p>
            {settings.postalBox ? <p className="ps-6 num">{settings.postalBox}</p> : null}
            <p className="ps-6">{t("checkIn", { time: settings.checkInTime })} · {t("checkOut", { time: settings.checkOutTime })}</p>
          </address>
        </div>
        <div>
          <p className="eyebrow mb-4 text-sand-300">{t("reservations")}</p>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={`tel:${settings.phone.replace(/\s+/g, "")}`}><Phone className="size-4 text-sand-300" /><span className="num">{settings.phone}</span></a></li>
            {settings.phoneSecondary ? <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={`tel:${settings.phoneSecondary.replace(/\s+/g, "")}`}><Phone className="size-4 text-sand-300" /><span className="num">{settings.phoneSecondary}</span></a></li> : null}
            <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={`mailto:${settings.email}`}><Mail className="size-4 text-sand-300" /><span className="ltr-field">{settings.email}</span></a></li>
            {settings.facebookUrl ? <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={settings.facebookUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4 text-sand-300" />{t("followUs")}</a></li> : null}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4 text-sand-300">{t("explore")}</p>
          <ul className="grid grid-cols-2 gap-2 text-sm text-ivory/80">
            {links.map((l) => (
              <li key={l.href}><Link className="hover:text-ivory" href={l.href}>{l.label}</Link></li>
            ))}
            <li><Link className="text-sand-300 hover:text-ivory" href="/admin">{tn("admin")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ivory/55 md:flex-row md:items-center md:justify-between">
          <p>{t("rights", { year })}</p>
          <p className="max-w-xl md:text-end">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
