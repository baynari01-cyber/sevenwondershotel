import type { Role } from "@/generated/prisma/enums";

export const PERMISSIONS = [
  "dashboard.view",
  "reservations.view",
  "reservations.manage",
  "calendar.view",
  "rooms.view",
  "rooms.manage",
  "rates.view",
  "rates.manage",
  "content.view",
  "content.manage",
  "reports.view",
  "settings.view",
  "settings.manage",
  "users.manage",
  "demo.reset",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set(PERMISSIONS),
  MANAGER: new Set<Permission>([
    "dashboard.view",
    "reservations.view",
    "reservations.manage",
    "calendar.view",
    "rooms.view",
    "rooms.manage",
    "rates.view",
    "rates.manage",
    "content.view",
    "content.manage",
    "reports.view",
    "settings.view",
    "settings.manage",
    "demo.reset",
  ]),
  FRONT_DESK: new Set<Permission>([
    "dashboard.view",
    "reservations.view",
    "reservations.manage",
    "calendar.view",
    "rooms.view",
    "rates.view",
    "content.view",
  ]),
  VIEWER: new Set<Permission>([
    "dashboard.view",
    "reservations.view",
    "calendar.view",
    "rooms.view",
    "rates.view",
    "content.view",
    "reports.view",
    "settings.view",
  ]),
};

export function roleHas(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}
