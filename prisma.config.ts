import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Explicitly load .env.local so Prisma CLI picks up DATABASE_URL
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
