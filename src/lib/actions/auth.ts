"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";

const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200),
  next: z.string().max(200).optional(),
});

export type LoginState = { error?: "invalid" | "rateLimited" | "validation" } | null;

// Minimal in-memory throttle (per server instance) to slow down credential stuffing in the demo.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), next: formData.get("next") || undefined });
  if (!parsed.success) return { error: "validation" };
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(`${ip}:${parsed.data.email.toLowerCase()}`)) return { error: "rateLimited" };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const valid = user && user.isActive ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) return { error: "invalid" };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await createSessionToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
  await setSessionCookie(token);

  const locale = await getLocale();
  const next = parsed.data.next && /^\/(?:(en|ar)\/)?admin(?:\/|$)/.test(parsed.data.next) ? parsed.data.next.replace(/^\/(en|ar)(?=\/)/, "") : "/admin";
  redirect({ href: next, locale });
  return null;
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await clearSessionCookie();
  const locale = await getLocale();
  if (user) {
    await prisma.activityLog.create({ data: { actorId: user.id, actorName: user.name, action: "auth_logout", entityType: "user", entityId: user.id, summary: "signed out" } });
  }
  redirect({ href: "/admin/login", locale });
}
