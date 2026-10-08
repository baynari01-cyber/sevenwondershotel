import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { clearDemoData, seedDatabase } from "../src/lib/demo/seed";

/**
 * Seeds the demo dataset. Uses the `pg` driver by default; set DATABASE_ADAPTER=neon to seed a Neon
 * database over WebSockets (useful from environments where raw TCP to port 5432 is blocked).
 */
async function createClient(): Promise<PrismaClient> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (process.env.DATABASE_ADAPTER === "neon") {
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const { neonConfig } = await import("@neondatabase/serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  }
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main() {
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 10) {
    throw new Error("DEMO_ADMIN_PASSWORD must be set (10+ characters) before seeding");
  }
  const prisma = await createClient();
  try {
    await clearDemoData(prisma);
    const result = await seedDatabase(prisma, { adminPassword, log: (m) => console.log(`• ${m}`) });
    console.log(`Seed complete: ${result.reservations} demo reservations.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
