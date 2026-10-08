"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown, Inbox, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ContactMessageDTO } from "@/lib/data/admin-catalog";
import { deleteMessageAction, markAllMessagesReadAction, setMessageReadAction } from "@/lib/actions/admin-content";
import { formatDateTime } from "@/lib/utils/format";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

export function InboxList({ messages, filter, unread, canManage }: { messages: ContactMessageDTO[]; filter: "all" | "unread"; unread: number; canManage: boolean }) {
  const t = useTranslations("admin.inbox");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const router = useRouter();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<ContactMessageDTO | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function setRead(m: ContactMessageDTO, isRead: boolean) {
    setPendingId(m.id);
    startTransition(async () => {
      feedback(await setMessageReadAction({ id: m.id, isRead }), isRead ? t("markedRead") : t("markedUnread"));
      setPendingId(null);
    });
  }

  function open(m: ContactMessageDTO) {
    const next = openId === m.id ? null : m.id;
    setOpenId(next);
    if (next && !m.isRead && canManage) {
      // Opening an unread message marks it read quietly (no toast); the list refreshes to drop the highlight.
      startTransition(async () => {
        const result = await setMessageReadAction({ id: m.id, isRead: true });
        if (result.ok) router.refresh();
      });
    }
  }

  function markAll() {
    startTransition(async () => {
      feedback(await markAllMessagesReadAction(), t("allRead"));
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteMessageAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-md bg-sand-100/70 p-1" aria-label={tc("filter")}>
          {(["all", "unread"] as const).map((f) => (
            <Link key={f} href={f === "all" ? "/admin/inbox" : "/admin/inbox?filter=unread"} aria-current={filter === f ? "page" : undefined} className={cn("inline-flex h-9 items-center gap-2 rounded-sm px-3.5 text-sm font-medium transition-colors", filter === f ? "bg-white text-charcoal shadow-sm" : "text-charcoal-muted hover:text-charcoal")}>
              {f === "all" ? tc("all") : t("unread")}
              {f === "unread" && unread ? <span className="num rounded-full bg-copper px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span> : null}
            </Link>
          ))}
        </nav>
        {canManage && unread > 0 ? <Button variant="outline" size="sm" onClick={markAll} disabled={pending}><MailOpen />{t("markAllRead")}</Button> : null}
      </div>

      {messages.length ? (
        <ul className="divide-y divide-charcoal/10 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-soft">
          {messages.map((m) => {
            const expanded = openId === m.id;
            return (
              <li key={m.id} className={cn("transition-colors", !m.isRead && "bg-copper/[0.04]")} data-testid={`message-${m.id}`} data-read={m.isRead}>
                <button type="button" onClick={() => open(m)} aria-expanded={expanded} aria-controls={`msg-${m.id}`} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-start hover:bg-ivory-soft/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-copper sm:gap-4 sm:px-5">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", m.isRead ? "bg-sand-100 text-stone" : "bg-copper text-white")} aria-hidden="true">{m.isRead ? <MailOpen className="size-4" /> : <Mail className="size-4" />}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={cn("truncate text-sm", m.isRead ? "font-medium" : "font-semibold text-charcoal")} dir="auto">{m.name}</span>
                      <span className="ltr-field truncate text-xs text-muted-foreground">{m.email}</span>
                      {!m.isRead ? <Badge variant="copper">{t("unread")}</Badge> : null}
                      <Badge variant="neutral">{m.locale.toUpperCase()}</Badge>
                    </span>
                    <span className={cn("mt-0.5 block truncate text-sm", m.isRead ? "text-muted-foreground" : "text-charcoal")} dir="auto">{m.subject}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="num hidden text-xs text-stone sm:block">{formatDateTime(m.createdAt, locale)}</span>
                    <ChevronDown className={cn("size-4 text-stone transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>
                {expanded ? (
                  <div id={`msg-${m.id}`} className="border-t border-charcoal/10 bg-ivory-soft/60 px-4 py-4 sm:px-5 sm:ps-[4.5rem]">
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <div><dt className="sr-only">{t("received")}</dt><dd className="num">{t("received")}: {formatDateTime(m.createdAt, locale)}</dd></div>
                      <div><dt className="sr-only">Email</dt><dd><a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="ltr-field hover:text-copper">{m.email}</a></dd></div>
                      {m.phone ? <div className="flex items-center gap-1"><Phone className="size-3" aria-hidden="true" /><dt className="sr-only">{t("phone")}</dt><dd><a href={`tel:${m.phone.replace(/\s+/g, "")}`} className="num hover:text-copper">{m.phone}</a></dd></div> : null}
                    </dl>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-charcoal" dir="auto">{m.message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild variant="accent" size="sm"><a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}><Mail />{t("reply")}</a></Button>
                      {canManage ? (
                        <>
                          <Button variant="outline" size="sm" disabled={pendingId === m.id} onClick={() => setRead(m, !m.isRead)} data-testid={`toggle-read-${m.id}`}>{m.isRead ? <Mail /> : <MailOpen />}{m.isRead ? t("markUnread") : t("markRead")}</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(m)} className="text-danger hover:text-danger"><Trash2 />{tc("delete")}</Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Inbox} title={filter === "unread" ? t("noUnread") : t("empty")} body={filter === "unread" ? t("noUnreadHint") : t("emptyHint")} />
      )}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deleteMessage")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}
