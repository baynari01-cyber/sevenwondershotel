import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ReservationRowDTO } from "@/lib/data/admin";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import { StatusBadge, PaymentBadge } from "./status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export async function ReservationTable({ rows, compact = false }: { rows: ReservationRowDTO[]; compact?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("admin.reservations");
  const ts = await getTranslations("source");
  if (!rows.length) return <EmptyState icon={ClipboardList} title={t("empty")} />;
  return (
    <div className="overflow-x-auto rounded-lg border border-charcoal/10 bg-white shadow-soft">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-ivory-soft text-xs uppercase tracking-wider text-stone">
          <tr>
            <th className="px-4 py-3 text-start font-semibold">{t("reference")}</th>
            <th className="px-4 py-3 text-start font-semibold">{t("guest")}</th>
            <th className="px-4 py-3 text-start font-semibold">{t("dates")}</th>
            <th className="px-4 py-3 text-start font-semibold">{t("room")}</th>
            {!compact ? <th className="px-4 py-3 text-start font-semibold">{t("source")}</th> : null}
            <th className="px-4 py-3 text-end font-semibold">{t("total")}</th>
            <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
            {!compact ? <th className="px-4 py-3 text-start font-semibold">{t("payment")}</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/10">
          {rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-ivory-soft/60">
              <td className="px-4 py-3"><Link href={`/admin/reservations/${r.id}`} className="num font-semibold text-copper-deep hover:underline">{r.reference}</Link></td>
              <td className="px-4 py-3"><p className="font-medium">{r.guestName}</p><p className="text-xs text-muted-foreground ltr-field">{r.guestEmail}</p></td>
              <td className="px-4 py-3 whitespace-nowrap"><span className="num">{formatDate(r.checkIn, locale, "short")}</span> → <span className="num">{formatDate(r.checkOut, locale, "short")}</span><p className="text-xs text-muted-foreground">{r.nights} × {r.adults + r.children}</p></td>
              <td className="px-4 py-3">{r.rooms.map((room, i) => <p key={i} className="whitespace-nowrap">{pickLocale(room, "roomTypeName", locale)}{room.roomNumber ? <span className="num text-xs text-muted-foreground"> · {room.roomNumber}</span> : null}</p>)}</td>
              {!compact ? <td className="px-4 py-3 text-xs text-muted-foreground">{ts(r.source)}</td> : null}
              <td className="num px-4 py-3 text-end font-medium">{formatMoney(r.grandTotal, r.currency, locale)}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              {!compact ? <td className="px-4 py-3"><PaymentBadge status={r.paymentStatus} /></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
