"use client";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { STEPS } from "./types";
import { cn } from "@/lib/utils/cn";

export function Stepper({ current, onJump }: { current: number; onJump: (step: number) => void }) {
  const t = useTranslations("booking");
  return (
    <nav aria-label={t("title")} className="no-print">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone sm:hidden">{t("stepOf", { current: current + 1, total: STEPS.length })}</p>
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((key, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => done && onJump(i)}
                disabled={!done}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active && "border-charcoal bg-charcoal text-ivory",
                  done && "border-copper/40 bg-copper/10 text-copper-deep hover:bg-copper/20",
                  !active && !done && "border-charcoal/10 text-stone",
                )}
              >
                <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold", active ? "bg-ivory text-charcoal" : done ? "bg-copper text-white" : "bg-charcoal/10 text-stone")}>
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn(!active && "hidden sm:inline")}>{t(`steps.${key}`)}</span>
              </button>
              {i < STEPS.length - 1 ? <span aria-hidden="true" className="hidden h-px w-4 bg-charcoal/15 sm:block" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
