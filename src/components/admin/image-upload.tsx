"use client";
import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

export type UploadedImage = { url: string; width: number; height: number };

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Site-relative image path input with an "Upload" button that posts to /api/admin/upload.
 * The parent owns the value; `onUploaded` additionally receives the intrinsic dimensions.
 */
export function ImageUploadField({ id, label, value, onChange, onUploaded, error, disabled, required, hint, previewClassName }: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUploaded?: (image: UploadedImage) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  previewClassName?: string;
}) {
  const t = useTranslations("admin.rooms");
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast({ kind: "error", title: t("uploadTooLarge") });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as Partial<UploadedImage> & { error?: string };
      if (!res.ok || typeof json.url !== "string") {
        toast({ kind: "error", title: res.status === 403 ? t("uploadForbidden") : res.status === 415 ? t("uploadUnsupported") : res.status === 413 ? t("uploadTooLarge") : t("uploadFailed") });
        return;
      }
      onChange(json.url);
      onUploaded?.({ url: json.url, width: json.width ?? 0, height: json.height ?? 0 });
      toast({ kind: "success", title: t("uploaded") });
    } catch {
      toast({ kind: "error", title: t("uploadFailed") });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const showPreview = value.startsWith("/") && !value.includes("..");

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint ?? t("imagePathHint")} required={required}>
      <div className="flex gap-3">
        <div className={cn("relative size-11 shrink-0 overflow-hidden rounded-md border border-charcoal/10 bg-sand-100", previewClassName)} aria-hidden="true">
          {showPreview ? <Image src={value} alt="" fill sizes="44px" className="object-cover" unoptimized /> : <ImageIcon className="absolute start-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-sand-400 rtl:translate-x-1/2" />}
        </div>
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/images/hotel/…" className="ltr-field" aria-invalid={error ? true : undefined} disabled={disabled || uploading} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <Button type="button" variant="outline" className="shrink-0" disabled={disabled || uploading} onClick={() => fileRef.current?.click()} aria-label={t("upload")} data-testid={`${id}-upload`}>
          <Upload className={cn(uploading && "animate-pulse")} />
          <span className="hidden sm:inline">{uploading ? t("uploading") : t("upload")}</span>
        </Button>
      </div>
    </Field>
  );
}
