import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  async adapter() {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    return new PrismaPg({ connectionString: env("DATABASE_URL") });
  },
});