import "../lib/load-env";
import fs from "node:fs";
import path from "node:path";
import { EMAIL_SAMPLES } from "../lib/email-samples";

// npm run email:preview — writes every email the site sends, with sample values,
// to email-previews/ (git-ignored). Open email-previews/index.html in a browser.
const dir = path.resolve("email-previews");
fs.mkdirSync(dir, { recursive: true });

const links: string[] = [];
for (const [name, build] of Object.entries(EMAIL_SAMPLES)) {
  const email = build();
  fs.writeFileSync(path.join(dir, `${name}.html`), email.html);
  fs.writeFileSync(path.join(dir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}`);
  links.push(`<li><a href="${name}.html">${name}</a> — ${email.subject.replace(/</g, "&lt;")} (<a href="${name}.txt">text</a>)</li>`);
}
fs.writeFileSync(
  path.join(dir, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Email previews</title><body style="font-family:sans-serif;padding:24px"><h1>SSGHS Alumni emails</h1><ul>${links.join("")}</ul></body>`
);
console.log(`Wrote ${links.length} emails to ${dir}. Open index.html in a browser.`);
