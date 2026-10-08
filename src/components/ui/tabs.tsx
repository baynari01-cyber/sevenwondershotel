"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex h-11 w-full items-center gap-1 overflow-x-auto rounded-md bg-sand-100/70 p-1 text-charcoal-muted sm:w-auto", className)}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3.5 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-charcoal data-[state=active]:shadow-sm focus-visible:outline-2 focus-visible:outline-copper disabled:opacity-50 sm:flex-none",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-5 focus-visible:outline-none", className)} {...props} />;
}
