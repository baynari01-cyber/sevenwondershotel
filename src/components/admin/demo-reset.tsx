"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import { resetDemoAction } from "@/lib/actions/admin-settings";
import { useAdminFeedback } from "@/components/admin/use-admin-feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DemoResetCard() {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const feedback = useAdminFeedback({ GENERIC: t("resetFailed") });
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      const result = await resetDemoAction();
      const title = result.ok ? t("resetDone", { count: result.data.reservations }) : "";
      const { ok } = feedback(result, title);
      if (ok) setOpen(false);
    });
  }

  return (
    <section className="rounded-lg border border-copper/30 bg-copper/5 p-5 shadow-soft sm:p-6" data-testid="demo-reset">
      <p className="eyebrow">{t("demo")}</p>
      <h3 className="mt-2 font-display text-2xl">{t("resetTitle")}</h3>
      <p className="mt-2 max-w-2xl text-sm text-charcoal-muted">{t("resetBody")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("demoResetHint")}</p>
      <div className="mt-5">
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={pending} data-testid="reset-demo">
          {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} {pending ? t("resetting") : t("resetButton")}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent closeLabel={tc("close")} className="max-w-md" onInteractOutside={(e) => pending && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("resetTitle")}</DialogTitle>
            <DialogDescription>{t("resetConfirm")}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-charcoal-muted" aria-live="polite">{pending ? t("resetting") : t("resetBody")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>{tc("cancel")}</Button>
            <Button variant="destructive" onClick={run} disabled={pending} data-testid="confirm-reset">
              {pending ? <Loader2 className="animate-spin" /> : null} {pending ? t("resetting") : t("resetButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
