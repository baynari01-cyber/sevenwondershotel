"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, UserPlus, Users } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import type { UserRowDTO } from "@/lib/data/admin";
import { createUserAction, updateUserAction } from "@/lib/actions/admin-users";
import { useAdminFeedback, type FieldErrors } from "@/components/admin/use-admin-feedback";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

const ROLES: Role[] = ["ADMIN", "MANAGER", "FRONT_DESK", "VIEWER"];
const ROLE_TONE: Record<Role, "copper" | "dark" | "info" | "neutral"> = { ADMIN: "copper", MANAGER: "dark", FRONT_DESK: "info", VIEWER: "neutral" };

type Editing = { kind: "new" } | { kind: "edit"; user: UserRowDTO } | null;

export function UsersTable({ users, currentUserId }: { users: UserRowDTO[]; currentUserId: string }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const tr = useTranslations("role");
  const locale = useLocale();
  const [editing, setEditing] = React.useState<Editing>(null);

  return (
    <div className="space-y-4" data-testid="users-module">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("usersHint")}</p>
        <Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-user"><UserPlus /> {t("newUser")}</Button>
      </div>
      {users.length ? (
        <div className="overflow-x-auto rounded-lg border border-charcoal/10 bg-white shadow-soft">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ivory-soft text-xs uppercase tracking-wider text-stone">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("userName")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("userEmail")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("userRole")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("userActive")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("lastLogin")}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold"><span className="sr-only">{tc("edit")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {users.map((u) => (
                <tr key={u.id} className={cn(!u.isActive && "text-stone")} data-testid={`user-row-${u.email}`}>
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {u.id === currentUserId ? <Badge variant="sand" className="ms-2">{t("you")}</Badge> : null}
                  </td>
                  <td className="px-4 py-3"><span className="ltr-field">{u.email}</span></td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_TONE[u.role]}>{tr(u.role)}</Badge>
                    <p className="mt-1 hidden text-xs text-muted-foreground lg:block">{t(`roleDescriptions.${u.role}`)}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant={u.isActive ? "success" : "neutral"}>{u.isActive ? t("userActive") : t("inactive")}</Badge></td>
                  <td className="num whitespace-nowrap px-4 py-3 text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt, locale) : t("never")}</td>
                  <td className="px-4 py-3 text-end">
                    <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "edit", user: u })} aria-label={`${t("editUser")}: ${u.name}`} data-testid={`edit-user-${u.email}`}><Pencil /> {tc("edit")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Users} title={t("users")} />
      )}
      {editing ? <UserDialog editing={editing} currentUserId={currentUserId} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function UserDialog({ editing, currentUserId, onClose }: { editing: NonNullable<Editing>; currentUserId: string; onClose: () => void }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const tr = useTranslations("role");
  const feedback = useAdminFeedback({ EMAIL_TAKEN: t("emailTaken"), SELF_DEACTIVATE: t("selfDeactivate"), LAST_ADMIN: t("lastAdmin") });
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const user = editing.kind === "edit" ? editing.user : null;
  const isSelf = user?.id === currentUserId;
  const [form, setForm] = React.useState({ name: user?.name ?? "", email: user?.email ?? "", role: (user?.role ?? "FRONT_DESK") as Role, isActive: user?.isActive ?? true, password: "" });
  const passwordOk = user ? form.password.length === 0 || form.password.length >= 10 : form.password.length >= 10;
  const valid = form.name.trim().length >= 2 && (user ? true : /.+@.+\..+/.test(form.email)) && passwordOk;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const result = user
        ? await updateUserAction({ id: user.id, name: form.name, role: form.role, isActive: form.isActive, password: form.password || undefined })
        : await createUserAction({ name: form.name, email: form.email, role: form.role, password: form.password });
      const { ok, fieldErrors } = feedback(result, user ? t("userUpdated") : t("userCreated"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <form onSubmit={submit} className="grid gap-4" data-testid="user-dialog">
          <DialogHeader>
            <DialogTitle>{user ? t("editUser") : t("newUser")}</DialogTitle>
            <DialogDescription>{user ? <span className="ltr-field">{user.email}</span> : t("usersHint")}</DialogDescription>
          </DialogHeader>
          <Field label={t("userName")} htmlFor="user-name" required error={errors.name}>
            <Input id="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={80} dir="auto" aria-invalid={errors.name ? true : undefined} data-testid="user-name" />
          </Field>
          {!user ? (
            <Field label={t("userEmail")} htmlFor="user-email" required error={errors.email}>
              <Input id="user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={120} autoComplete="off" aria-invalid={errors.email ? true : undefined} data-testid="user-email" />
            </Field>
          ) : null}
          <Field label={t("userRole")} htmlFor="user-role" required error={errors.role} hint={t(`roleDescriptions.${form.role}`)}>
            <NativeSelect id="user-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} data-testid="user-role">
              {ROLES.map((r) => <option key={r} value={r}>{tr(r)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={user ? t("newPassword") : t("userPassword")} htmlFor="user-password" required={!user} error={errors.password} hint={user ? t("newPasswordHint") : t("passwordHint")}>
            <Input id="user-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={user ? undefined : 10} maxLength={200} autoComplete="new-password" aria-invalid={errors.password || !passwordOk ? true : undefined} className="ltr-field" data-testid="user-password" />
          </Field>
          {user ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-charcoal/10 bg-ivory-soft/60 px-4 py-3">
              <div>
                <Label htmlFor="user-active" className="cursor-pointer">{t("userActive")}</Label>
                {isSelf ? <p className="mt-1 text-xs text-muted-foreground">{t("selfDeactivate")}</p> : null}
                {errors.isActive ? <p role="alert" className="mt-1 text-xs text-danger">{errors.isActive}</p> : null}
              </div>
              <Switch id="user-active" checked={form.isActive} disabled={isSelf} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="user-active" />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending || !valid} data-testid="user-submit">{pending ? tc("saving") : user ? tc("save") : tc("create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
