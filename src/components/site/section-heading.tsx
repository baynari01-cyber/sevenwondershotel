import { cn } from "@/lib/utils/cn";

export function SectionHeading({ eyebrow, title, body, align = "start", tone = "light", className, as: Tag = "h2" }: { eyebrow?: string; title: string; body?: string; align?: "start" | "center"; tone?: "light" | "dark"; className?: string; as?: "h1" | "h2" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className={cn("eyebrow", tone === "dark" && "text-sand-300")}>{eyebrow}</p> : null}
      <Tag className={cn("display-lg mt-3", tone === "dark" ? "text-ivory" : "text-charcoal")}>{title}</Tag>
      <div className={cn("hairline-copper mt-5", align === "center" && "mx-auto")} />
      {body ? <p className={cn("mt-5 text-base leading-relaxed sm:text-lg", tone === "dark" ? "text-ivory/75" : "text-muted-foreground")}>{body}</p> : null}
    </div>
  );
}
