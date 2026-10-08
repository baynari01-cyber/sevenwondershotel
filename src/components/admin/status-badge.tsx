import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger" | "dark"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "info",
  CHECKED_OUT: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "dark",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  return <Badge variant={STATUS_TONE[status] ?? "neutral"}>{t(status as "PENDING")}</Badge>;
}

const PAYMENT_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  UNPAID: "warning",
  PAY_AT_PROPERTY: "neutral",
  SIMULATED_PAID: "success",
  PARTIALLY_PAID: "info",
  REFUNDED: "danger",
};

export function PaymentBadge({ status }: { status: string }) {
  const t = useTranslations("paymentStatus");
  return <Badge variant={PAYMENT_TONE[status] ?? "neutral"}>{t(status as "UNPAID")}</Badge>;
}
