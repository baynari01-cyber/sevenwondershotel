"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { AdminResult } from "@/lib/admin/action";

/** Field path → human-readable message, ready for `<Field error>`. */
export type FieldErrors = Record<string, string>;

type Issue = { path: string; message: string };

export function issuesOf(result: AdminResult<unknown>): Issue[] {
  if (result.ok || result.error !== "VALIDATION") return [];
  const issues = result.details?.issues;
  if (!Array.isArray(issues)) return [];
  return issues.map((i) => {
    const issue = i as Partial<Issue>;
    return { path: String(issue.path ?? ""), message: String(issue.message ?? "") };
  });
}

/** First validation issue code ("LAST_ADMIN", "range", …) of a failed admin action, if any. */
export function firstIssue(result: AdminResult<unknown>): Issue | null {
  return issuesOf(result)[0] ?? null;
}

const ZOD_PATTERNS: Array<[RegExp, "required" | "email" | "minLength" | "maxLength" | "number" | "positive" | "date"]> = [
  [/invalid email/i, "email"],
  [/expected number|not a number|invalid input: expected number/i, "number"],
  [/>=\s*1\b.*number|>0|positive/i, "positive"],
  [/too small.*(string|character)/i, "minLength"],
  [/too big.*(string|character)/i, "maxLength"],
  [/invalid date/i, "date"],
  [/too small|required|expected string/i, "required"],
];

/**
 * Shared toast + refresh handling for admin mutations.
 * Returns `{ ok, fieldErrors }` so forms can highlight invalid fields. Omit `successTitle` for a silent success
 * (the router still refreshes); `messages` maps an error code
 * (or a validation issue code such as "LAST_ADMIN") to a module-specific translated message.
 */
export function useAdminFeedback(messages: Record<string, string> = {}) {
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("admin");
  const te = useTranslations("booking.errors");
  const ts = useTranslations("admin.settings");
  const tv = useTranslations("validation");

  const describe = (issue: Issue): string => {
    if (messages[issue.message]) return messages[issue.message];
    for (const [pattern, key] of ZOD_PATTERNS) {
      if (pattern.test(issue.message)) {
        const digits = issue.message.match(/(\d+)/)?.[1] ?? "";
        return key === "minLength" ? tv("minLength", { min: digits }) : key === "maxLength" ? tv("maxLength", { max: digits }) : tv(key);
      }
    }
    // Readable sentence from the server → show as-is; bare codes ("range") fall back to a generic hint.
    return /\s/.test(issue.message) ? issue.message : ts("validationError");
  };

  return (result: AdminResult<unknown>, successTitle?: string, options?: { refresh?: boolean; description?: string }): { ok: boolean; fieldErrors: FieldErrors } => {
    if (result.ok) {
      if (successTitle) toast({ kind: "success", title: successTitle, description: options?.description });
      if (options?.refresh !== false) router.refresh();
      return { ok: true, fieldErrors: {} };
    }
    const issues = issuesOf(result);
    const fieldErrors: FieldErrors = {};
    for (const issue of issues) if (issue.path && !fieldErrors[issue.path]) fieldErrors[issue.path] = describe(issue);
    const issueCode = issues.find((i) => messages[i.message])?.message;
    const code = issueCode ?? result.error;
    const message =
      messages[code] ??
      (code === "FORBIDDEN"
        ? t("forbidden")
        : code === "UNAUTHENTICATED"
          ? t("unauthenticated")
          : code === "VALIDATION"
            ? ts("validationError")
            : code === "NOT_AVAILABLE"
              ? te("availabilityChanged")
              : code === "MIN_STAY"
                ? te("minStay", { count: 2 })
                : code === "CLOSED_DATE"
                  ? te("closedDate")
                  : te("generic"));
    toast({ kind: "error", title: message });
    return { ok: false, fieldErrors };
  };
}
