"use client";
import * as React from "react";
import { Tabs } from "@/components/ui/tabs";

/** Radix Tabs whose active value is mirrored into the `?tab=` query string so refreshes and shared links keep the tab. */
export function UrlTabs({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [value, setValue] = React.useState(defaultValue);
  function change(next: string) {
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }
  return <Tabs value={value} onValueChange={change} className={className}>{children}</Tabs>;
}
