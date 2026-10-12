import dotenv from "dotenv";

// For scripts run outside Next.js (seed, db:push backfill, tools): read env files
// the way Next.js does, .env.local first so it wins, then .env. Every local tool
// then talks to the same database as `next dev`. Variables already set in the
// shell are never overridden. Import this before anything that reads the env.
// On the server (NODE_ENV=production) .env.production comes first, as in Next.js.
if (process.env.NODE_ENV === "production") dotenv.config({ path: ".env.production", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
