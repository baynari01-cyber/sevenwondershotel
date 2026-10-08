"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Wrench } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { CalendarBlockDTO, CalendarDTO, CalendarReservationDTO, CalendarRoomTypeDTO } from "@/lib/data/admin";
import { createBlockAction, deleteBlockAction } from "@/lib/actions/admin-calendar";
import { addDays, dayOfWeek, diffNights } from "@/lib/utils/dates";
import { formatDate, pickLocale } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminFeedback } from "@/components/admin/use-admin-feedback";

type Props = { data: CalendarDTO; canManage: boolean };

const BLOCK_REASONS = ["MAINTENANCE", "OUT_OF_ORDER", "OWNER_USE", "OTHER"] as const;

/** Greedy interval partitioning so overlapping unassigned stays each get their own lane. */
function lanesFor(items: CalendarReservationDTO[]): CalendarReservationDTO[][] {
  const lanes: Array<{ end: string; items: CalendarReservationDTO[] }> = [];
  for (const item of [...items].sort((a, b) => a.checkIn.localeCompare(b.checkIn))) {
    const lane = lanes.find((l) => l.end <= item.checkIn);
    if (lane) {
      lane.items.push(item);
      lane.end = item.checkOut;
    } else lanes.push({ end: item.checkOut, items: [item] });
  }
  return lanes.map((l) => l.items);
}

export function OccupancyCalendar({ data, canManage }: Props) {
  const t = useTranslations("admin.calendar");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startNavigation] = React.useTransition();
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [blockDefaults, setBlockDefaults] = React.useState<{ roomId: string; date: string } | null>(null);
  // Remount the dialog form on every open so it always starts from the current defaults.
  const [blockKey, setBlockKey] = React.useState(0);
  const openBlockDialog = (defaults: { roomId: string; date: string } | null) => {
    setBlockDefaults(defaults);
    setBlockKey((k) => k + 1);
    setBlockOpen(true);
  };
  const [removing, setRemoving] = React.useState<CalendarBlockDTO | null>(null);

  const { start, days, dates, today, weekendDays } = data;
  const end = addDays(start, days);
  const rangeLabel = t("range", { from: formatDate(start, locale, "medium"), to: formatDate(addDays(end, -1), locale, "medium") });

  const go = (nextStart: string, nextDays = days) => {
    const params = new URLSearchParams({ start: nextStart, days: String(nextDays) });
    startNavigation(() => router.replace(`${pathname}?${params}`));
  };

  const roomsById = React.useMemo(() => new Map(data.roomTypes.flatMap((rt) => rt.rooms.map((r) => [r.id, { ...r, type: rt }] as const))), [data.roomTypes]);
  const hasRooms = data.roomTypes.some((rt) => rt.rooms.length > 0);

  return (
    <div className="space-y-4" data-testid="occupancy-calendar">
      <div className="flex flex-col gap-3 rounded-lg border border-charcoal/10 bg-white p-3 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-charcoal/15">
            <Button variant="ghost" size="iconSm" aria-label={t("previous")} onClick={() => go(addDays(start, -days))} disabled={navigating} data-testid="cal-prev">
              <ChevronLeft className="rtl:-scale-x-100" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 border-x border-charcoal/15 rounded-none px-3" onClick={() => go(today)} disabled={navigating || start === today} data-testid="cal-today">
              {t("today")}
            </Button>
            <Button variant="ghost" size="iconSm" aria-label={t("nextPeriod")} onClick={() => go(addDays(start, days))} disabled={navigating} data-testid="cal-next">
              <ChevronRight className="rtl:-scale-x-100" />
            </Button>
          </div>
          <p className="num text-sm font-medium text-charcoal" aria-live="polite">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t("days", { count: days })} className="inline-flex rounded-md bg-sand-100/70 p-1">
            {[14, 30].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={days === n}
                onClick={() => go(start, n)}
                className={cn("num rounded-sm px-3 py-1 text-xs font-medium transition-colors", days === n ? "bg-white text-charcoal shadow-sm" : "text-charcoal-muted hover:text-charcoal")}
                data-testid={`cal-days-${n}`}
              >
                {t("days", { count: n })}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone">
            <span className="sr-only sm:not-sr-only">{t("jumpTo")}</span>
            <Input type="date" aria-label={t("jumpTo")} value={start} onChange={(e) => e.target.value && go(e.target.value)} className="h-9 w-40 text-xs" data-testid="cal-jump" />
          </label>
          {canManage ? (
            <Button variant="accent" size="sm" onClick={() => openBlockDialog(null)} data-testid="add-block">
              <Plus /> {t("addBlock")}
            </Button>
          ) : null}
        </div>
      </div>

      <Legend />

      {hasRooms ? (
        <div
          className={cn("relative overflow-auto rounded-lg border border-charcoal/10 bg-white shadow-soft transition-opacity max-h-[72vh] [--label:6.5rem] sm:[--label:8rem]", days > 14 ? "[--col:2.5rem] md:[--col:2.75rem]" : "[--col:3.25rem] md:[--col:4.25rem]", navigating && "opacity-60")}
          aria-busy={navigating}
          data-testid="calendar-grid"
        >
          <div role="grid" aria-label={t("title")} aria-rowcount={-1} className="min-w-max text-xs">
            <HeaderRow dates={dates} today={today} weekendDays={weekendDays} locale={locale} />
            {data.roomTypes.map((rt) => (
              <RoomTypeSection
                key={rt.id}
                type={rt}
                data={data}
                locale={locale}
                canManage={canManage}
                onBlockClick={(block) => canManage && setRemoving(block)}
                onEmptyCell={(roomId, date) => { if (canManage) openBlockDialog({ roomId, date }); }}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={CalendarDays} title={t("noRooms")} />
      )}
      <p className="text-xs text-muted-foreground">{t("pastPeriod")} {t("availabilityHint")}</p>

      {canManage ? (
        <>
          <BlockDialog key={blockKey} open={blockOpen} onOpenChange={setBlockOpen} roomTypes={data.roomTypes} defaults={blockDefaults} range={{ start, today }} />
          <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
            <DialogContent closeLabel={tc("close")}>
              {removing ? <RemoveBlockBody block={removing} room={roomsById.get(removing.roomId)} onDone={() => setRemoving(null)} /> : null}
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

function Legend() {
  const t = useTranslations("admin.calendar");
  const items: Array<{ label: string; swatch: React.ReactNode }> = [
    { label: t("legendConfirmed"), swatch: <span className="h-3 w-6 rounded-sm bg-copper" /> },
    { label: t("legendPending"), swatch: <span className="h-3 w-6 rounded-sm border border-dashed border-copper bg-sand-100" /> },
    { label: t("legendCheckedIn"), swatch: <span className="h-3 w-6 rounded-sm bg-charcoal" /> },
    { label: t("legendArrival"), swatch: <span className="h-3 w-6 rounded-sm border-s-[3px] border-charcoal bg-copper/40" /> },
    { label: t("legendBlock"), swatch: <span className="h-3 w-6 rounded-sm border border-stone/40" style={{ backgroundImage: HATCH }} /> },
    { label: t("legendWeekend"), swatch: <span className="h-3 w-6 rounded-sm bg-sand-100" /> },
    { label: t("today"), swatch: <span className="h-3 w-6 rounded-sm bg-copper/15 ring-1 ring-copper/40" /> },
  ];
  return (
    <ul aria-label={t("legend")} className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-charcoal-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-2">{i.swatch}<span>{i.label}</span></li>
      ))}
    </ul>
  );
}

const HATCH = "repeating-linear-gradient(135deg, rgba(138,128,119,0.35) 0 4px, rgba(138,128,119,0.08) 4px 8px)";

function gridStyle(count: number): React.CSSProperties {
  return { display: "grid", gridTemplateColumns: `var(--label) repeat(${count}, var(--col))` };
}

function cellTone(date: string, today: string, weekendDays: number[]) {
  const weekend = weekendDays.includes(dayOfWeek(date));
  return { weekend, isToday: date === today };
}

function HeaderRow({ dates, today, weekendDays, locale }: { dates: string[]; today: string; weekendDays: number[]; locale: string }) {
  const t = useTranslations("admin.calendar");
  const weekdayFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { weekday: "short", timeZone: "UTC" });
  const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
  return (
    <div role="row" className="sticky top-0 z-30 border-b border-charcoal/15 bg-white" style={gridStyle(dates.length)}>
      <div role="columnheader" className="sticky start-0 z-40 flex items-end border-e border-charcoal/10 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone">{t("roomNumber")}</div>
      {dates.map((date) => {
        const { weekend, isToday } = cellTone(date, today, weekendDays);
        const d = new Date(`${date}T12:00:00Z`);
        const first = date.endsWith("-01") || date === dates[0];
        return (
          <div
            role="columnheader"
            key={date}
            aria-current={isToday ? "date" : undefined}
            className={cn("flex flex-col items-center justify-end border-e border-charcoal/5 py-1.5 leading-tight", weekend && "bg-sand-100/60", isToday && "bg-copper/10")}
          >
            {first ? <span className="text-[9px] uppercase tracking-wide text-copper">{new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { month: "short", timeZone: "UTC" }).format(d)}</span> : null}
            <span className={cn("text-[10px] uppercase", isToday ? "text-copper" : "text-stone")}>{weekdayFmt.format(d)}</span>
            <span className={cn("num text-sm font-semibold", isToday ? "text-copper" : "text-charcoal")}>{dayFmt.format(d)}</span>
          </div>
        );
      })}
    </div>
  );
}

function BackgroundCells({ dates, today, weekendDays, onClick, rowLabel }: { dates: string[]; today: string; weekendDays: number[]; onClick?: (date: string) => void; rowLabel: string }) {
  return (
    <>
      {dates.map((date, i) => {
        const { weekend, isToday } = cellTone(date, today, weekendDays);
        const className = cn("h-full border-e border-b border-charcoal/5", weekend && "bg-sand-100/40", isToday && "bg-copper/5", onClick && "cursor-cell hover:bg-copper/10 focus-visible:bg-copper/10");
        const style: React.CSSProperties = { gridColumn: i + 2, gridRow: 1 };
        return onClick ? (
          <button type="button" key={date} role="gridcell" aria-label={`${rowLabel} · ${date}`} className={className} style={style} onClick={() => onClick(date)} tabIndex={-1} />
        ) : (
          <div key={date} role="gridcell" className={className} style={style} />
        );
      })}
    </>
  );
}

/** Column placement for an end-exclusive stay, clipped to the visible window. Returns null when nothing is visible. */
function placement(checkIn: string, checkOut: string, start: string, days: number) {
  const end = addDays(start, days);
  const from = checkIn > start ? checkIn : start;
  const to = checkOut < end ? checkOut : end;
  const span = diffNights(from, to);
  if (span <= 0) return null;
  return { col: diffNights(start, from) + 2, span, startsInside: checkIn >= start, endsInside: checkOut <= end };
}

function ReservationBar({ r, start, days, locale }: { r: CalendarReservationDTO; start: string; days: number; locale: string }) {
  const t = useTranslations("admin.calendar");
  const ts = useTranslations("status");
  const p = placement(r.checkIn, r.checkOut, start, days);
  if (!p) return null;
  const tone =
    r.status === "CHECKED_IN"
      ? "bg-charcoal text-ivory hover:bg-charcoal-soft"
      : r.status === "PENDING"
        ? "border border-dashed border-copper bg-sand-100 text-charcoal hover:bg-sand-200"
        : "bg-copper text-white hover:bg-copper-deep";
  const nights = diffNights(r.checkIn, r.checkOut);
  const title = `${r.guestName} · ${r.reference} · ${formatDate(r.checkIn, locale, "short")} → ${formatDate(r.checkOut, locale, "short")} · ${t("stayNights", { count: nights })} · ${ts(r.status)}`;
  return (
    <Link
      href={`/admin/reservations/${r.id}`}
      title={title}
      aria-label={t("viewReservation", { ref: r.reference })}
      data-testid={`bar-${r.reference}`}
      data-status={r.status}
      className={cn(
        "z-10 my-1.5 flex min-w-0 items-center gap-1 overflow-hidden rounded-sm px-1.5 text-[11px] font-medium leading-none shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-copper",
        tone,
        p.startsInside ? "ms-1 border-s-[3px] border-s-charcoal" : "rounded-s-none",
        p.endsInside ? "me-1" : "rounded-e-none",
        r.status === "CHECKED_IN" && p.startsInside && "border-s-sand-300",
        r.status === "PENDING" && p.startsInside && "border-s-copper",
      )}
      style={{ gridColumn: `${p.col} / span ${p.span}`, gridRow: 1 }}
    >
      <span className="truncate">{p.span >= 3 ? `${r.guestLastName} · ${r.reference}` : r.guestLastName}</span>
    </Link>
  );
}

function BlockBar({ block, start, days, locale, onClick, canManage }: { block: CalendarBlockDTO; start: string; days: number; locale: string; onClick: () => void; canManage: boolean }) {
  const t = useTranslations("admin.calendar");
  const tb = useTranslations("blockReason");
  const p = placement(block.startDate, block.endDate, start, days);
  if (!p) return null;
  const title = `${tb(block.reason)} · ${formatDate(block.startDate, locale, "short")} → ${formatDate(block.endDate, locale, "short")}${block.note ? ` · ${block.note}` : ""}`;
  const className = cn("z-10 my-1.5 flex min-w-0 items-center overflow-hidden rounded-sm border border-stone/40 px-1.5 text-[11px] font-medium leading-none text-charcoal-muted", p.startsInside ? "ms-1" : "rounded-s-none", p.endsInside ? "me-1" : "rounded-e-none", canManage && "cursor-pointer hover:border-charcoal/60 focus-visible:outline-2 focus-visible:outline-copper");
  const style: React.CSSProperties = { gridColumn: `${p.col} / span ${p.span}`, gridRow: 1, backgroundImage: HATCH, backgroundColor: "#fff" };
  const content = <span className="inline-flex min-w-0 items-center gap-1 truncate"><Wrench className="size-3 shrink-0" />{p.span >= 2 ? <span className="truncate">{tb(block.reason)}</span> : null}</span>;
  return canManage ? (
    <button type="button" title={title} aria-label={`${t("removeBlock")}: ${title}`} className={className} style={style} onClick={onClick} data-testid={`block-${block.id}`}>{content}</button>
  ) : (
    <div title={title} className={className} style={style} data-testid={`block-${block.id}`}>{content}</div>
  );
}

function RoomTypeSection({ type, data, locale, canManage, onBlockClick, onEmptyCell }: {
  type: CalendarRoomTypeDTO;
  data: CalendarDTO;
  locale: string;
  canManage: boolean;
  onBlockClick: (block: CalendarBlockDTO) => void;
  onEmptyCell: (roomId: string, date: string) => void;
}) {
  const t = useTranslations("admin.calendar");
  const { dates, today, weekendDays, start, days } = data;
  const total = type.rooms.length;
  const name = pickLocale(type, "name", locale);
  const unassigned = data.reservations.filter((r) => r.roomTypeId === type.id && !r.roomId);
  const lanes = lanesFor(unassigned);
  const roomIds = new Set(type.rooms.map((r) => r.id));
  const blocks = data.blocks.filter((b) => roomIds.has(b.roomId));

  return (
    <div role="rowgroup" data-testid={`type-${type.code}`}>
      <div role="row" className="border-b border-charcoal/10 bg-ivory-soft" style={gridStyle(dates.length)}>
        <div role="rowheader" className="sticky start-0 z-20 border-e border-charcoal/10 bg-ivory-soft px-3 py-2">
          <p className="truncate font-semibold text-charcoal" title={name}>{name}</p>
          <p className="num text-[10px] text-stone">{type.code} · {t("roomsOfType", { count: total })}</p>
        </div>
        {type.availability.map((avail, i) => {
          const date = dates[i];
          const { weekend, isToday } = cellTone(date, today, weekendDays);
          const closed = type.closed[i];
          const ratio = total ? avail / total : 0;
          const tone = closed ? "text-stone" : avail === 0 ? "bg-rose/15 text-danger" : ratio <= 0.25 ? "bg-warning/10 text-warning" : "text-success";
          return (
            <div
              role="gridcell"
              key={date}
              title={closed ? t("closed") : t("summary", { available: avail, total })}
              className={cn("num flex items-center justify-center border-e border-charcoal/5 py-2 text-[11px] font-semibold", weekend && "bg-sand-100/40", isToday && "bg-copper/5", tone)}
              style={closed ? { backgroundImage: HATCH } : undefined}
              data-testid={`avail-${type.code}-${date}`}
            >
              {closed ? <span className="sr-only">{t("closed")}</span> : <><span>{avail}</span><span className="text-stone/70">/{total}</span></>}
            </div>
          );
        })}
      </div>

      {lanes.map((lane, laneIdx) => (
        <div role="row" key={`unassigned-${laneIdx}`} className="relative h-10 border-b border-dashed border-charcoal/10" style={gridStyle(dates.length)}>
          <div role="rowheader" className="sticky start-0 z-20 flex items-center border-e border-charcoal/10 bg-white px-3 text-[11px] italic text-stone" style={{ gridColumn: 1, gridRow: 1 }}>
            {laneIdx === 0 ? t("unassigned") : <span className="sr-only">{t("unassigned")}</span>}
          </div>
          <BackgroundCells dates={dates} today={today} weekendDays={weekendDays} rowLabel={t("unassigned")} />
          {lane.map((r) => <ReservationBar key={r.reservationRoomId} r={r} start={start} days={days} locale={locale} />)}
        </div>
      ))}

      {type.rooms.map((room) => {
        const rowLabel = `${room.number}`;
        return (
          <div role="row" key={room.id} className="relative h-10 border-b border-charcoal/5 last:border-b-0" style={gridStyle(dates.length)} data-testid={`room-${room.number}`}>
            <div role="rowheader" className="sticky start-0 z-20 flex items-center justify-between gap-2 border-e border-charcoal/10 bg-white px-3" style={{ gridColumn: 1, gridRow: 1 }}>
              <span className="num font-medium text-charcoal">{room.number}</span>
              <span className="num hidden text-[10px] text-stone sm:inline">{t("floor", { floor: room.floor })}</span>
            </div>
            <BackgroundCells dates={dates} today={today} weekendDays={weekendDays} rowLabel={rowLabel} onClick={canManage ? (date) => onEmptyCell(room.id, date) : undefined} />
            {data.reservations.filter((r) => r.roomId === room.id).map((r) => <ReservationBar key={r.reservationRoomId} r={r} start={start} days={days} locale={locale} />)}
            {blocks.filter((b) => b.roomId === room.id).map((b) => <BlockBar key={b.id} block={b} start={start} days={days} locale={locale} canManage={canManage} onClick={() => onBlockClick(b)} />)}
          </div>
        );
      })}
    </div>
  );
}

function BlockDialog({ open, onOpenChange, roomTypes, defaults, range }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypes: CalendarRoomTypeDTO[];
  defaults: { roomId: string; date: string } | null;
  range: { start: string; today: string };
}) {
  const t = useTranslations("admin.calendar");
  const tb = useTranslations("blockReason");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useAdminFeedback({ NOT_AVAILABLE: t("blockConflict") });
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState(() => {
    const date = defaults?.date ?? (range.today >= range.start ? range.today : range.start);
    return { roomId: defaults?.roomId ?? "", startDate: date, endDate: addDays(date, 1), reason: "MAINTENANCE" as (typeof BLOCK_REASONS)[number], note: "" };
  });
  const valid = Boolean(form.roomId) && form.endDate > form.startDate;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const { ok } = feedback(await createBlockAction({ ...form, note: form.note || undefined }), t("blockAdded"));
      if (ok) onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("addBlock")}</DialogTitle>
            <DialogDescription>{t("legendBlock")} · {t("blockTo")}</DialogDescription>
          </DialogHeader>
          <Field label={t("blockRoom")} htmlFor="block-room" required>
            <NativeSelect id="block-room" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} required data-testid="block-room">
              <option value="">{t("selectRoom")}</option>
              {roomTypes.map((rt) => (
                <optgroup key={rt.id} label={pickLocale(rt, "name", locale)}>
                  {rt.rooms.map((r) => <option key={r.id} value={r.id}>{r.number} · {t("floor", { floor: r.floor })}</option>)}
                </optgroup>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("blockFrom")} htmlFor="block-from" required>
              <Input id="block-from" type="date" value={form.startDate} onChange={(e) => { const v = e.target.value; setForm({ ...form, startDate: v, endDate: form.endDate > v ? form.endDate : addDays(v, 1) }); }} required data-testid="block-from" />
            </Field>
            <Field label={t("blockTo")} htmlFor="block-to" required error={form.endDate <= form.startDate ? t("blockTo") : undefined}>
              <Input id="block-to" type="date" min={addDays(form.startDate, 1)} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required aria-invalid={form.endDate <= form.startDate || undefined} data-testid="block-to" />
            </Field>
          </div>
          <Field label={t("blockReason")} htmlFor="block-reason">
            <NativeSelect id="block-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as (typeof BLOCK_REASONS)[number] })} data-testid="block-reason">
              {BLOCK_REASONS.map((r) => <option key={r} value={r}>{tb(r)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t("blockNote")} htmlFor="block-note" hint={tc("optional")}>
            <Textarea id="block-note" rows={2} maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t("blockNotePlaceholder")} dir="auto" className="min-h-16" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending || !valid} data-testid="block-submit">{pending ? tc("saving") : t("addBlock")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveBlockBody({ block, room, onDone }: { block: CalendarBlockDTO; room: { number: string; floor: number; type: CalendarRoomTypeDTO } | undefined; onDone: () => void }) {
  const t = useTranslations("admin.calendar");
  const tb = useTranslations("blockReason");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  const nights = diffNights(block.startDate, block.endDate);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("removeBlock")}</DialogTitle>
        <DialogDescription>{t("removeBlockConfirm")}</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md bg-ivory-soft p-4 text-sm">
        <dt className="text-muted-foreground">{t("blockRoom")}</dt>
        <dd className="num font-medium">{room ? `${room.number} · ${pickLocale(room.type, "name", locale)}` : "—"}</dd>
        <dt className="text-muted-foreground">{t("blockFrom")}</dt>
        <dd className="num">{formatDate(block.startDate, locale, "medium")}</dd>
        <dt className="text-muted-foreground">{t("blockTo")}</dt>
        <dd className="num">{formatDate(block.endDate, locale, "medium")} · {t("stayNights", { count: nights })}</dd>
        <dt className="text-muted-foreground">{t("blockReason")}</dt>
        <dd>{tb(block.reason)}</dd>
        {block.note ? <><dt className="text-muted-foreground">{t("blockNote")}</dt><dd dir="auto">{block.note}</dd></> : null}
      </dl>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>{tc("cancel")}</Button>
        <Button variant="destructive" disabled={pending} data-testid="confirm-remove-block" onClick={() => startTransition(async () => { if (feedback(await deleteBlockAction({ id: block.id }), t("blockRemoved")).ok) onDone(); })}>
          {pending ? tc("saving") : t("removeBlock")}
        </Button>
      </DialogFooter>
    </>
  );
}
