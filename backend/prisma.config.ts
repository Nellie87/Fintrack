import "dotenv/config";
import { defineConfig } from "prisma/config";

// Used by the Prisma CLI only (migrate, seed, generate).
// Migrations run over the direct (non-pooled) Neon connection; the app itself
// connects through the pooled DATABASE_URL in src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
