import dotenv from "dotenv";
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") dotenv.config({ path: ".env.production", quiet: true });
  dotenv.config({ path: ".env.local", quiet: true });
  dotenv.config({ path: ".env", quiet: true });
}
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
