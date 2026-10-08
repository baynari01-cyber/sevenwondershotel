"use client";
import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { pickLocale } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Img = { id: string; url: string; altEn: string; altAr: string };

export function RoomGallery({ images, title }: { images: Img[]; title: string }) {
  const locale = useLocale();
  const t = useTranslations("gallery");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const total = images.length;
  const prev = React.useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);
  const next = React.useCallback(() => setIndex((i) => (i + 1) % total), [total]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") (locale === "ar" ? next : prev)();
      if (e.key === "ArrowRight") (locale === "ar" ? prev : next)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next, locale]);

  if (!total) return null;
  const current = images[index];

  return (
    <>
      <div className={cn("grid gap-3", total > 1 ? "md:grid-cols-[2fr_1fr]" : "")}>
        <button type="button" onClick={() => { setIndex(0); setOpen(true); }} className="img-grade img-warm relative aspect-[16/10] overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-copper" aria-label={t("open", { index: 1, total })}>
          <Image src={images[0].url} alt={pickLocale(images[0], "alt", locale)} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover transition-transform duration-700 hover:scale-[1.03]" />
        </button>
        {total > 1 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {images.slice(1, 3).map((img, i) => (
              <button key={img.id} type="button" onClick={() => { setIndex(i + 1); setOpen(true); }} className="img-grade img-warm relative aspect-[16/10] overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-copper" aria-label={t("open", { index: i + 2, total })}>
                <Image src={img.url} alt={pickLocale(img, "alt", locale)} fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover transition-transform duration-700 hover:scale-[1.03]" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal/95 animate-fade-in" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none" aria-describedby={undefined}>
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            <div className="relative h-[70vh] w-full max-w-5xl">
              <Image src={current.url} alt={pickLocale(current, "alt", locale)} fill sizes="100vw" className="object-contain" />
            </div>
            <p className="mt-4 text-sm text-ivory/80">{pickLocale(current, "alt", locale)} · <span className="num">{index + 1} / {total}</span></p>
            {total > 1 ? (
              <>
                <button type="button" onClick={prev} aria-label={t("previous")} className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-ivory/10 p-3 text-ivory hover:bg-ivory/20"><ChevronLeft className="size-6 rtl:-scale-x-100" /></button>
                <button type="button" onClick={next} aria-label={t("nextImage")} className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-ivory/10 p-3 text-ivory hover:bg-ivory/20"><ChevronRight className="size-6 rtl:-scale-x-100" /></button>
              </>
            ) : null}
            <DialogPrimitive.Close className="absolute end-4 top-4 rounded-full bg-ivory/10 p-2 text-ivory hover:bg-ivory/20" aria-label={tc("close")}><X className="size-5" /></DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
