import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { readSession } from "./session";
import { roleHas, type Permission } from "./permissions";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export class AuthError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.code = code;
  }
}

/**
 * Resolves the signed-in admin user from the session cookie and re-validates it against the database
 * (so disabled users or changed roles are enforced immediately, not only when the token expires).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

export async function requireUser(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (permission && !roleHas(user.role, permission)) throw new AuthError("FORBIDDEN");
  return user;
}

export function can(user: CurrentUser | null, permission: Permission): boolean {
  return user ? roleHas(user.role, permission) : false;
}
