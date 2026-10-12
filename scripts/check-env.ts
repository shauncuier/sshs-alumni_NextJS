import fs from "node:fs";
import dotenv from "dotenv";
import { checkProductionEnv } from "../lib/env-check";

// npm run env:check [file] — checks an env file as the production server would see
// it (default .env.production). Prints variable names only, never values. Exits
// with code 1 when the site would refuse to start.
const file = process.argv[2] || ".env.production";
if (!fs.existsSync(file)) {
  console.error(`${file} not found. Usage: npm run env:check -- <path to the production env file>`);
  process.exit(1);
}

const { errors, warnings } = checkProductionEnv(dotenv.parse(fs.readFileSync(file)));
console.log(`Checked ${file} as a production environment.\n`);
for (const e of errors) console.log(`ERROR    ${e}`);
for (const w of warnings) console.log(`warning  ${w}`);
if (errors.length === 0 && warnings.length === 0) console.log("All good.");
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);
