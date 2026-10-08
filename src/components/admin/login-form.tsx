"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("admin.login");
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label={t("email")} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required className="ltr-field" />
      </Field>
      <Field label={t("password")} htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="ltr-field" />
      </Field>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error === "rateLimited" ? t("rateLimited") : t("invalid")}
        </p>
      ) : null}
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={pending}>{pending ? t("signingIn") : t("submit")}</Button>
    </form>
  );
}
