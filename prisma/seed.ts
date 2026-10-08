import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { clearDemoData, seedDatabase } from "../src/lib/demo/seed";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 10) {
    throw new Error("DEMO_ADMIN_PASSWORD must be set (10+ characters) before seeding");
  }
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
