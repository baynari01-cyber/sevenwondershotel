"use client";
import * as React from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryCategory } from "@/generated/prisma/enums";
import type { GalleryImageDTO } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Filter = "ALL" | GalleryCategory;

/** Canonical display order for the category pills. */
const CATEGORY_ORDER: GalleryCategory[] = ["HOTEL", "ROOMS", "DINING", "POOL", "WELLNESS", "PETRA"];

/**
 * Deterministic crop rhythm so the CSS-column masonry reads as editorial rather than a uniform grid.
 * Index-based so it is stable between server render and hydration.
 */
const ASPECTS = ["aspect-[4/3]"] as const;

export function GalleryGrid({ images }: { images: GalleryImageDTO[] }) {
  const t = useTranslations("gallery");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [active, setActive] = React.useState<number | null>(null);

  const categories = React.useMemo<Filter[]>(() => {
    const present = new Set(images.map((i) => i.category));
    return ["ALL", ...CATEGORY_ORDER.filter((c) => present.has(c))];
  }, [images]);

  const visible = React.useMemo(() => (filter === "ALL" ? images : images.filter((i) => i.category === filter)), [images, filter]);
  const total = visible.length;
  const current = active === null ? null : visible[active];

  const go = React.useCallback(
    (delta: number) => {
      setActive((prev) => (prev === null || total === 0 ? prev : (prev + delta + total) % total));
    },
    [total],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Arrow keys follow visual direction, so in RTL "ArrowLeft" means "next".
    const rtl = locale === "ar";
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(rtl ? -1 : 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(rtl ? 1 : -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(total - 1);
    }
  };

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={t("filterLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => {
            const selected = c === filter;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setFilter(c);
                  setActive(null);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper",
                  selected ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/20 bg-transparent text-charcoal-muted hover:border-charcoal/50 hover:text-charcoal",
                )}
              >
                {t(`categories.${c}`)}
              </button>
            );
          })}
        </div>
        <p className="num text-xs uppercase tracking-wider text-stone" aria-live="polite">{t("count", { count: total })}</p>
      </div>

      {/* Masonry via CSS columns */}
      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-label={t("title")}>
        {visible.map((img, i) => {
          const caption = pickLocale(img, "caption", locale);
          return (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={t("open", { index: i + 1, total })}
                className={cn("img-grade img-warm group relative block w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper", ASPECTS[i % ASPECTS.length])}
              >
                <Image
                  src={img.url}
                  alt={caption}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-0 bottom-0 z-10 p-3 text-start text-xs font-medium text-ivory opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:p-4 sm:text-sm">
                  {caption}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Lightbox */}
      <DialogPrimitive.Root open={current !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal/95 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content
            onKeyDown={onKeyDown}
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col text-ivory outline-none data-[state=open]:animate-fade-in"
          >
            <DialogPrimitive.Title className="sr-only">{t("viewer")}</DialogPrimitive.Title>

            {current && active !== null ? (
              <>
                <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
                  <p className="num text-sm text-ivory/70">
                    {active + 1} / {total}
                  </p>
                  <DialogPrimitive.Close
                    aria-label={tc("close")}
                    className="inline-flex size-11 items-center justify-center rounded-full text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand-300"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>

                <figure className="flex min-h-0 flex-1 flex-col">
                  <div className="relative min-h-0 flex-1 px-4 py-3 sm:px-16">
                    <div className="relative size-full">
                      <Image
                        key={current.id}
                        src={current.url}
                        alt={pickLocale(current, "caption", locale)}
                        fill
                        priority
                        sizes="100vw"
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <figcaption className="px-4 pb-6 text-center sm:px-6">
                    <p className="font-display text-lg text-ivory sm:text-xl">{pickLocale(current, "caption", locale)}</p>
                    <p className="mt-1 text-xs text-ivory/55">
                      {t("credit")}: {current.source}
                    </p>
                  </figcaption>
                </figure>

                {total > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label={t("previous")}
                      className="absolute start-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-charcoal/40 text-ivory/90 backdrop-blur-sm transition-colors hover:bg-ivory/15 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand-300 sm:start-4 sm:size-12"
                    >
                      <ChevronLeft className="size-6 rtl:-scale-x-100" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      aria-label={t("nextImage")}
                      className="absolute end-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-charcoal/40 text-ivory/90 backdrop-blur-sm transition-colors hover:bg-ivory/15 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand-300 sm:end-4 sm:size-12"
                    >
                      <ChevronRight className="size-6 rtl:-scale-x-100" />
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
