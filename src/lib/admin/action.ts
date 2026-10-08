import "server-only";
import { prisma } from "@/lib/db";
import { AuthError, requireUser, type CurrentUser } from "@/lib/auth/current-user";
import type { Permission } from "@/lib/auth/permissions";
import { BookingError } from "@/lib/booking/service";
import type { Prisma } from "@/generated/prisma/client";

export type AdminResult<T = void> = { ok: true; data: T } | { ok: false; error: string; details?: Record<string, unknown> };

/**
 * Wraps a server action with authentication + permission checks and uniform error handling.
 * Every admin mutation must go through this so authorization is enforced on the server.
 */
export async function guarded<T>(permission: Permission, fn: (user: CurrentUser) => Promise<T>): Promise<AdminResult<T>> {
  try {
    const user = await requireUser(permission);
    const data = await fn(user);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    if (e instanceof BookingError) return { ok: false, error: e.code, details: e.details };
    if (e instanceof ValidationError) return { ok: false, error: "VALIDATION", details: { issues: e.issues } };
    console.error("[admin action]", e);
    return { ok: false, error: "GENERIC" };
  }
}

export class ValidationError extends Error {
  readonly issues: Array<{ path: string; message: string }>;
  constructor(issues: Array<{ path: string; message: string }>) {
    super("VALIDATION");
    this.issues = issues;
  }
}

export function parseOrThrow<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } }): T {
  if (result.success) return result.data;
  throw new ValidationError(result.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })));
}

export async function logActivity(
  user: CurrentUser,
  input: { action: string; entityType: string; entityId?: string | null; summary: string; metadata?: Prisma.InputJsonValue },
  db: { activityLog: { create: typeof prisma.activityLog.create } } = prisma,
) {
  await db.activityLog.create({
    data: {
      actorId: user.id,
      actorName: user.name,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}
