"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { guarded, logActivity, parseOrThrow, ValidationError, type AdminResult } from "@/lib/admin/action";
import { hashPassword } from "@/lib/auth/password";

const roleSchema = z.enum(["ADMIN", "MANAGER", "FRONT_DESK", "VIEWER"]);
const passwordSchema = z.string().min(10).max(200);

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  role: roleSchema,
  password: passwordSchema,
});

const updateUserSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(80),
  role: roleSchema,
  isActive: z.boolean(),
  password: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || v.length >= 10, { message: "minLength" }),
});

/** Domain rule violations surface as a validation issue so the client can show a specific message. */
function rule(code: "EMAIL_TAKEN" | "SELF_DEACTIVATE" | "LAST_ADMIN", path: string): never {
  throw new ValidationError([{ path, message: code }]);
}

function revalidate() {
  revalidatePath("/[locale]/admin", "layout");
}

export async function createUserAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return guarded("users.manage", async (user) => {
    const input = parseOrThrow(createUserSchema.safeParse(raw));
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) rule("EMAIL_TAKEN", "email");
    const passwordHash = await hashPassword(input.password);
    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash, isActive: true } });
      await logActivity(user, { action: "user_update", entityType: "user", entityId: u.id, summary: `created user ${u.email} (${u.role})`, metadata: { email: u.email, role: u.role, created: true } }, tx);
      return u;
    });
    revalidate();
    return { id: created.id };
  });
}

export async function updateUserAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return guarded("users.manage", async (user) => {
    const input = parseOrThrow(updateUserSchema.safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUniqueOrThrow({ where: { id: input.id } });
      if (target.id === user.id && !input.isActive) rule("SELF_DEACTIVATE", "isActive");
      const wasActiveAdmin = target.role === "ADMIN" && target.isActive;
      const staysActiveAdmin = input.role === "ADMIN" && input.isActive;
      if (wasActiveAdmin && !staysActiveAdmin) {
        const otherAdmins = await tx.user.count({ where: { role: "ADMIN", isActive: true, id: { not: target.id } } });
        if (otherAdmins === 0) rule("LAST_ADMIN", "role");
      }
      const passwordHash = input.password ? await hashPassword(input.password) : undefined;
      await tx.user.update({ where: { id: target.id }, data: { name: input.name, role: input.role, isActive: input.isActive, passwordHash } });
      const changes = [
        target.name !== input.name ? "name" : null,
        target.role !== input.role ? `role ${target.role} → ${input.role}` : null,
        target.isActive !== input.isActive ? (input.isActive ? "activated" : "deactivated") : null,
        passwordHash ? "password" : null,
      ].filter((x): x is string => Boolean(x));
      await logActivity(user, { action: "user_update", entityType: "user", entityId: target.id, summary: `updated user ${target.email}${changes.length ? ` (${changes.join(", ")})` : ""}`, metadata: { email: target.email, role: input.role, isActive: input.isActive, passwordChanged: Boolean(passwordHash) } }, tx);
    });
    revalidate();
    return { id: input.id };
  });
}
