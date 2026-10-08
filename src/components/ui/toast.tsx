"use client";
import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; title: string; description?: string };

type ToastContextValue = {
  toast: (input: { kind?: ToastKind; title: string; description?: string }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ kind = "info", title, description }) => {
      const id = ++counter.current;
      setItems((prev) => [...prev, { id, kind, title, description }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-white p-4 shadow-lift animate-fade-up",
              t.kind === "success" && "border-success/30",
              t.kind === "error" && "border-danger/30",
              t.kind === "info" && "border-charcoal/10",
            )}
          >
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : t.kind === "error" ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" /> : <Info className="mt-0.5 size-5 shrink-0 text-info" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p> : null}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded p-1 text-stone hover:text-charcoal" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
