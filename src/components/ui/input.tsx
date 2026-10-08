import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-md border border-charcoal/20 bg-white px-3.5 py-2 text-sm text-charcoal shadow-xs transition-colors placeholder:text-stone/80 focus-visible:border-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger/20 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-md border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal shadow-xs transition-colors placeholder:text-stone/80 focus-visible:border-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-11 w-full appearance-none rounded-md border border-charcoal/20 bg-white ps-3.5 pe-9 py-2 text-sm text-charcoal shadow-xs transition-colors focus-visible:border-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-stone"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
