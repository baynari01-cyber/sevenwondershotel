"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, pending, onConfirm, destructive = true }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const tc = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {body ? <DialogDescription>{body}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>{tc("cancel")}</Button>
          <Button variant={destructive ? "destructive" : "accent"} onClick={onConfirm} disabled={pending} data-testid="confirm-action">{pending ? tc("saving") : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
