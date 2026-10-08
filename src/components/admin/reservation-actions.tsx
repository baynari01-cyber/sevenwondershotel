"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ReservationDetailDTO } from "@/lib/data/admin";
import { addReservationNoteAction, assignRoomAction, modifyReservationAction, quoteForAdminAction, recordPaymentAction, updateReservationStatusAction } from "@/lib/actions/admin-reservations";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatMoney, pickLocale } from "@/lib/utils/format";

type Status = ReservationDetailDTO["status"];
const NEXT: Record<Status, Status[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "PENDING", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT", "CONFIRMED"],
  CHECKED_OUT: ["CHECKED_IN"],
  CANCELLED: ["CONFIRMED", "PENDING"],
  NO_SHOW: ["CONFIRMED"],
};

function useAdminFeedback() {
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("admin");
  const te = useTranslations("booking.errors");
  return (result: { ok: boolean; error?: string }, successTitle: string) => {
    if (result.ok) {
      toast({ kind: "success", title: successTitle });
      router.refresh();
      return true;
    }
    const code = result.error ?? "GENERIC";
    const message = code === "FORBIDDEN" ? t("forbidden") : code === "UNAUTHENTICATED" ? t("unauthenticated") : code === "NOT_AVAILABLE" ? te("availabilityChanged") : code === "MIN_STAY" ? te("minStay", { count: 2 }) : code === "CLOSED_DATE" ? te("closedDate") : te("generic");
    toast({ kind: "error", title: message });
    return false;
  };
}

export function StatusActions({ reservation, canManage }: { reservation: ReservationDetailDTO; canManage: boolean }) {
  const t = useTranslations("admin.reservations");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  if (!canManage) return null;

  const run = (status: Status, cancelReason?: string) =>
    startTransition(async () => {
      const ok = feedback(await updateReservationStatusAction({ id: reservation.id, status, reason: cancelReason }), t("statusUpdated"));
      if (ok) setCancelOpen(false);
    });

  const labels: Partial<Record<Status, string>> = { CONFIRMED: t("confirm"), CHECKED_IN: t("checkIn"), CHECKED_OUT: t("checkOut"), NO_SHOW: t("markNoShow"), CANCELLED: t("cancelReservation") };

  return (
    <div className="flex flex-wrap gap-2" data-testid="status-actions">
      {NEXT[reservation.status].map((s) =>
        s === "CANCELLED" ? (
          <Button key={s} variant="destructive" size="sm" disabled={pending} onClick={() => setCancelOpen(true)} data-testid="cancel-reservation">{labels[s]}</Button>
        ) : (
          <Button key={s} variant={s === "CONFIRMED" || s === "CHECKED_IN" ? "accent" : "outline"} size="sm" disabled={pending} onClick={() => run(s)} data-testid={`status-${s}`}>{labels[s] ?? ts(s)}</Button>
        ),
      )}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent closeLabel={tc("close")}>
          <DialogHeader><DialogTitle>{t("cancelReservation")}</DialogTitle><DialogDescription>{t("cancelConfirm")}</DialogDescription></DialogHeader>
          <Field label={t("cancelReason")} htmlFor="cancel-reason"><Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} dir="auto" /></Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>{tc("back")}</Button>
            <Button variant="destructive" disabled={pending} onClick={() => run("CANCELLED", reason)} data-testid="confirm-cancel">{t("cancelReservation")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AssignRoomSelect({ room, canManage }: { room: ReservationDetailDTO["rooms"][number]; canManage: boolean }) {
  const t = useTranslations("admin.reservations");
  const tcal = useTranslations("admin.calendar");
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  if (!canManage) return <span className="num">{room.roomNumber ?? t("unassigned")}</span>;
  return (
    <NativeSelect
      aria-label={t("assignRoom")}
      value={room.roomId ?? ""}
      disabled={pending}
      className="h-9 min-w-40 text-xs"
      onChange={(e) => { const roomId = e.target.value; if (!roomId) return; startTransition(async () => { feedback(await assignRoomAction({ reservationRoomId: room.id, roomId }), t("saved")); }); }}
    >
      <option value="">{t("unassigned")}</option>
      {room.candidateRooms.map((c) => <option key={c.id} value={c.id}>{c.number} · {tcal("floor", { floor: c.floor })}</option>)}
    </NativeSelect>
  );
}

export function NoteForm({ reservationId, canManage }: { reservationId: string; canManage: boolean }) {
  const t = useTranslations("admin.reservations");
  const feedback = useAdminFeedback();
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  if (!canManage) return null;
  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (!body.trim()) return; startTransition(async () => { if (feedback(await addReservationNoteAction({ reservationId, body }), t("saved"))) setBody(""); }); }}>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("notePlaceholder")} rows={2} dir="auto" aria-label={t("addNote")} />
      <Button type="submit" size="sm" variant="outline" disabled={pending || !body.trim()} className="self-end">{t("addNote")}</Button>
    </form>
  );
}

export function PaymentForm({ reservation, canManage }: { reservation: ReservationDetailDTO; canManage: boolean }) {
  const t = useTranslations("admin.reservations");
  const tm = useTranslations("paymentMethod");
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  const [amount, setAmount] = React.useState(() => Math.max(0, Number(reservation.grandTotal) - Number(reservation.paidTotal)).toFixed(2));
  const [method, setMethod] = React.useState("CASH");
  if (!canManage) return null;
  return (
    <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); startTransition(async () => { feedback(await recordPaymentAction({ reservationId: reservation.id, amount: Number(amount), method }), t("saved")); }); }}>
      <Field label={t("paymentAmount")} htmlFor="pay-amount"><Input id="pay-amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" /></Field>
      <Field label={t("payment")} htmlFor="pay-method"><NativeSelect id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} className="h-9">{(["CASH", "SIMULATED_CARD", "BANK_TRANSFER", "PAY_AT_PROPERTY"] as const).map((m) => <option key={m} value={m}>{tm(m)}</option>)}</NativeSelect></Field>
      <Button type="submit" size="sm" variant="outline" disabled={pending || Number(amount) <= 0}>{t("recordPayment")}</Button>
    </form>
  );
}

export function ModifyStayDialog({ reservation, roomTypes, ratePlans, extras, canManage }: {
  reservation: ReservationDetailDTO;
  roomTypes: Array<{ id: string; nameEn: string; nameAr: string; maxAdults: number; maxChildren: number }>;
  ratePlans: Array<{ id: string; nameEn: string; nameAr: string }>;
  extras: Array<{ id: string; nameEn: string; nameAr: string }>;
  canManage: boolean;
}) {
  const t = useTranslations("admin.reservations");
  const tb = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useAdminFeedback();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    rooms: reservation.rooms.map((r) => ({ roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId, adults: r.adults, children: r.children })),
    extras: Object.fromEntries(extras.map((e) => [e.id, reservation.extras.find((x) => x.nameEn === e.nameEn)?.quantity ?? 0])) as Record<string, number>,
  });
  const [quote, setQuote] = React.useState<{ grandTotal: string; roomSubtotal: string } | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  if (!canManage || !["PENDING", "CONFIRMED", "CHECKED_IN"].includes(reservation.status)) return null;

  const payload = () => ({ checkIn: form.checkIn, checkOut: form.checkOut, rooms: form.rooms, extras: Object.entries(form.extras).filter(([, q]) => q > 0).map(([extraId, quantity]) => ({ extraId, quantity })), promotionCode: reservation.promotionCode });

  function preview() {
    startTransition(async () => {
      const r = await quoteForAdminAction(payload());
      if (r.ok) { setQuote({ grandTotal: r.data.grandTotal, roomSubtotal: r.data.roomSubtotal }); setQuoteError(null); }
      else { setQuote(null); setQuoteError(r.error); }
    });
  }
  function save() {
    startTransition(async () => {
      const ok = feedback(await modifyReservationAction({ id: reservation.id, ...payload() }), t("saved"));
      if (ok) setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{t("modify")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" closeLabel={tc("close")}>
          <DialogHeader><DialogTitle>{t("modify")}</DialogTitle><DialogDescription>{t("modifyHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tb("search.checkIn")} htmlFor="m-ci"><Input id="m-ci" type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field>
            <Field label={tb("search.checkOut")} htmlFor="m-co"><Input id="m-co" type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field>
          </div>
          <div className="space-y-3">
            {form.rooms.map((room, i) => {
              const rt = roomTypes.find((x) => x.id === room.roomTypeId);
              return (
                <div key={i} className="grid gap-2 rounded-md border border-charcoal/10 p-3 sm:grid-cols-4">
                  <NativeSelect aria-label={t("room")} value={room.roomTypeId} onChange={(e) => setForm({ ...form, rooms: form.rooms.map((r, j) => (j === i ? { ...r, roomTypeId: e.target.value } : r)) })} className="h-9 text-xs">{roomTypes.map((x) => <option key={x.id} value={x.id}>{pickLocale(x, "name", locale)}</option>)}</NativeSelect>
                  <NativeSelect aria-label={t("ratePlan")} value={room.ratePlanId} onChange={(e) => setForm({ ...form, rooms: form.rooms.map((r, j) => (j === i ? { ...r, ratePlanId: e.target.value } : r)) })} className="h-9 text-xs">{ratePlans.map((x) => <option key={x.id} value={x.id}>{pickLocale(x, "name", locale)}</option>)}</NativeSelect>
                  <NativeSelect aria-label={tb("search.adults")} value={room.adults} onChange={(e) => setForm({ ...form, rooms: form.rooms.map((r, j) => (j === i ? { ...r, adults: Number(e.target.value) } : r)) })} className="h-9 text-xs">{Array.from({ length: rt?.maxAdults ?? 4 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{tc("adults", { count: n })}</option>)}</NativeSelect>
                  <NativeSelect aria-label={tb("search.children")} value={room.children} onChange={(e) => setForm({ ...form, rooms: form.rooms.map((r, j) => (j === i ? { ...r, children: Number(e.target.value) } : r)) })} className="h-9 text-xs">{Array.from({ length: (rt?.maxChildren ?? 0) + 1 }, (_, n) => n).map((n) => <option key={n} value={n}>{tc("children", { count: n })}</option>)}</NativeSelect>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, rooms: [...form.rooms, { roomTypeId: roomTypes[0].id, ratePlanId: ratePlans[0].id, adults: 2, children: 0 }] })}>+ {t("room")}</Button>
              {form.rooms.length > 1 ? <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, rooms: form.rooms.slice(0, -1) })}>− {t("room")}</Button> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {extras.map((e) => (
              <label key={e.id} className="flex items-center justify-between gap-2 rounded-md border border-charcoal/10 px-3 py-2 text-sm"><span>{pickLocale(e, "name", locale)}</span><Input type="number" min={0} max={10} value={form.extras[e.id] ?? 0} onChange={(ev) => setForm({ ...form, extras: { ...form.extras, [e.id]: Number(ev.target.value) } })} className="h-8 w-20" /></label>
            ))}
          </div>
          {quote ? <p className="rounded-md bg-ivory-soft px-3 py-2 text-sm">{t("total")}: <span className="num font-semibold text-copper-deep">{formatMoney(quote.grandTotal, reservation.currency, locale)}</span></p> : null}
          {quoteError ? <p role="alert" className="text-sm text-danger">{quoteError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={preview} disabled={pending}>{tb("review.priceTitle")}</Button>
            <Button variant="accent" onClick={save} disabled={pending || !quote}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
