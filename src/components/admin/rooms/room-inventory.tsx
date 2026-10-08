"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { RoomRowDTO, RoomTypeOptionDTO } from "@/lib/data/admin-catalog";
import { deleteRoomAction, saveRoomAction, setRoomActiveAction } from "@/lib/actions/admin-rooms";
import { pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, SwitchField, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";

type Editing = { kind: "new"; roomTypeId: string } | { kind: "edit"; room: RoomRowDTO } | null;

export function RoomInventory({ rooms, roomTypes, canManage }: { rooms: RoomRowDTO[]; roomTypes: RoomTypeOptionDTO[]; canManage: boolean }) {
  const t = useTranslations("admin.rooms");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<RoomRowDTO | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const groups = roomTypes.map((rt) => ({ type: rt, rooms: rooms.filter((r) => r.roomTypeId === rt.id) }));
  const orphans = rooms.filter((r) => !roomTypes.some((rt) => rt.id === r.roomTypeId));

  function toggle(room: RoomRowDTO, isActive: boolean) {
    setPendingId(room.id);
    startTransition(async () => {
      feedback(await setRoomActiveAction({ id: room.id, isActive }), t("saved"));
      setPendingId(null);
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteRoomAction({ id: deleting.id }), t("roomDeleted"));
      if (ok) setDeleting(null);
    });
  }

  if (!roomTypes.length) return <EmptyState icon={DoorOpen} title={t("noTypes")} body={t("noTypesHint")} />;

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex justify-end">
          <Button variant="accent" onClick={() => setEditing({ kind: "new", roomTypeId: roomTypes[0].id })} data-testid="add-room"><Plus />{t("newRoom")}</Button>
        </div>
      ) : null}
      {groups.map(({ type, rooms: list }) => (
        <section key={type.id} aria-labelledby={`rooms-${type.id}`}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`rooms-${type.id}`} className="font-display text-xl">{pickLocale(type, "name", locale)} <span className="num ms-2 text-sm text-stone">{type.code}</span></h2>
            <p className="num text-xs uppercase tracking-wider text-stone">{t("activeCount", { active: list.filter((r) => r.isActive).length, total: list.length })}</p>
          </div>
          {list.length ? (
            <DataTable minWidth={640}>
              <thead className={theadClass}>
                <tr>
                  <Th>{t("number")}</Th>
                  <Th>{t("floor")}</Th>
                  <Th>{t("hasBalcony")}</Th>
                  <Th>{t("isActiveShort")}</Th>
                  <Th>{t("notes")}</Th>
                  <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {list.map((room) => (
                  <tr key={room.id} className={room.isActive ? "" : "text-muted-foreground"} data-testid={`room-${room.number}`}>
                    <Td><span className="num font-semibold">{room.number}</span></Td>
                    <Td><span className="num">{room.floor}</span></Td>
                    <Td>{room.hasBalcony ? <Badge variant="sand">{t("balcony")}</Badge> : <span className="text-stone">—</span>}</Td>
                    <Td>
                      {canManage ? (
                        <Switch checked={room.isActive} disabled={pendingId === room.id} onCheckedChange={(v) => toggle(room, v)} aria-label={`${t("isActive")}: ${room.number}`} />
                      ) : (
                        <Badge variant={room.isActive ? "success" : "neutral"}>{room.isActive ? t("active") : t("inactive")}</Badge>
                      )}
                    </Td>
                    <Td><span className="line-clamp-1 max-w-xs text-xs" dir="auto">{room.notes ?? "—"}</span></Td>
                    <Td align="end">
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", room })} aria-label={`${t("editRoom")} ${room.number}`}><Pencil /></Button>
                          <Button variant="ghost" size="iconSm" onClick={() => setDeleting(room)} aria-label={`${tc("delete")} ${room.number}`} disabled={room.reservationCount > 0} title={room.reservationCount > 0 ? t("hasReservations") : undefined}><Trash2 /></Button>
                        </div>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="rounded-md border border-dashed border-charcoal/20 px-4 py-6 text-center text-sm text-muted-foreground">{t("noRooms")}</p>
          )}
        </section>
      ))}
      {orphans.length ? <p className="text-xs text-muted-foreground">{t("orphanRooms", { count: orphans.length })}</p> : null}

      {editing ? <RoomDialog key={editing.kind === "edit" ? editing.room.id : "new"} editing={editing} roomTypes={roomTypes} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deleteRoom")} body={deleting ? t("deleteRoomConfirm", { number: deleting.number }) : undefined} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function RoomDialog({ editing, roomTypes, onClose }: { editing: NonNullable<Editing>; roomTypes: RoomTypeOptionDTO[]; onClose: () => void }) {
  const t = useTranslations("admin.rooms");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const room = editing.kind === "edit" ? editing.room : null;
  const [form, setForm] = React.useState({
    roomTypeId: room?.roomTypeId ?? (editing.kind === "new" ? editing.roomTypeId : roomTypes[0].id),
    number: room?.number ?? "",
    floor: String(room?.floor ?? 1),
    hasBalcony: room?.hasBalcony ?? false,
    isActive: room?.isActive ?? true,
    notes: room?.notes ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveRoomAction({ id: room?.id, ...form, floor: Number(form.floor) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{room ? t("editRoom") : t("newRoom")}</DialogTitle>
            <DialogDescription>{t("roomDialogHint")}</DialogDescription>
          </DialogHeader>
          <Field label={t("category")} htmlFor="room-type" required error={errors.roomTypeId}>
            <NativeSelect id="room-type" value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })} aria-invalid={errors.roomTypeId ? true : undefined}>
              {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{pickLocale(rt, "name", locale)} · {rt.code}</option>)}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("number")} htmlFor="room-number" required error={errors.number}>
              <Input id="room-number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="ltr-field" maxLength={10} aria-invalid={errors.number ? true : undefined} autoFocus />
            </Field>
            <Field label={t("floor")} htmlFor="room-floor" required error={errors.floor}>
              <Input id="room-floor" type="number" min={-2} max={60} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} aria-invalid={errors.floor ? true : undefined} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchField id="room-balcony" label={t("hasBalcony")} checked={form.hasBalcony} onCheckedChange={(v) => setForm({ ...form, hasBalcony: v })} />
            <SwitchField id="room-active" label={t("isActive")} checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
          <Field label={t("notes")} htmlFor="room-notes" error={errors.notes} hint={tc("optional")}>
            <Textarea id="room-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto" maxLength={300} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-room">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
