# Production Roadmap — SSGHS Alumni Platform

**Created:** 2026-10-11 · **Goal:** take the platform from "works locally" to a safe public launch.
**How we use it:** one step at a time, in order. A step is finished only when every line under **Done when** is true. Tick it in the tracker, commit, then start the next step.

Current state and the security review behind this list: [PROJECT_STATUS.md](PROJECT_STATUS.md).

Size: **S** ≈ under 2 hours · **M** ≈ half a day to a day · **L** ≈ several days.
**You** = needs a decision, an account or access only the committee has.

---

## Tracker

| # | Step | Phase | Size | Status |
| --- | --- | --- | --- | --- |
| 1 | Finish the activity log | 0 · In-flight | M | ✅ Done 2026-10-11 |
| 2 | Commit the volunteer page header/footer fix | 0 · In-flight | S | ✅ Done 2026-10-11 |
| 3 | Choose hosting, domain and backup location (**You**) | 1 · Decisions | S | ⏸️ Deferred — no domain/hosting yet; must be done before step 28 |
| 4 | Decide which sections launch, which are hidden (**You**) | 1 · Decisions | S | ✅ All sections launch |
| 5 | Decide payments at launch: manual only or online gateways (**You**) | 1 · Decisions | S | ✅ Manual only |
| 6 | Hide or remove the sections not launching | 2 · Real data | M | ⏭️ Nothing to hide (step 4) |
| 6a | Donations page: manual payment + committee verification (no gateway) | 2 · Real data | M | ✅ Done 2026-10-11 |
| 6b | Contact form: email the committee (today it is only kept in the activity log) | 2 · Real data | S | ✅ Code done 2026-10-11 (inbox test in step 17) |
| 7 | Volunteers into the database | 2 · Real data | M | ✅ Done 2026-10-11 |
| 8 | Bulk SMS history into the database | 2 · Real data | S | ✅ Done 2026-10-11 |
| 9a | News from the database, managed in admin | 2 · Real data | M | ✅ Done 2026-10-12 |
| 9b | Gallery from the database, managed in admin | 2 · Real data | M | ✅ Done 2026-10-12 |
| 9c | Stories and achievements from the database, managed in admin | 2 · Real data | M | ✅ Done 2026-10-12 |
| 9d | Careers / job board stored in the database, with moderation | 2 · Real data | L | ✅ Done 2026-10-12 |
| 9e | Mentorship: real mentor profiles and booking requests | 2 · Real data | L | ✅ Done 2026-10-12 |
| 9f | Network built from real verified members | 2 · Real data | M | ✅ Done 2026-10-12 |
| 9g | Moderators can manage content (news, gallery, stories) | 2 · Real data | M | ✅ Done 2026-10-12 |
| 10 | Remove sample-data fallbacks from feed, dashboard, network, sitemap | 2 · Real data | M | ✅ Done 2026-10-12 |
| 11 | Production-safe seed (no sample content) | 2 · Real data | S | ✅ Done 2026-10-12 |
| 11a | Donation campaigns created and edited in admin | 2 · Real data | M | ✅ Done 2026-10-12 |
| 12 | Secrets and environment for production | 3 · Security | S | ✅ Code done 2026-10-12 (values set on the server in step 28) |
| 13 | Same-origin checks and body-size limits on every write route | 3 · Security | M | ✅ Done 2026-10-12 |
| 14 | Dependency audit and security headers | 3 · Security | S | ✅ Done 2026-10-12 |
| 15 | Privacy: delete rejected applicants' photos and documents | 3 · Security | S | ✅ Done 2026-10-12 |
| 16 | Fix the known edge cases (membership flag, moderator 403 text) | 3 · Security | S | ✅ Done 2026-10-12 |
| 17 | Email provider (Resend) with a verified domain (**You**) | 4 · Integrations | S | 🟡 Resend key and association email set 2026-10-12; domain verification waits for the domain (step 3) |
| 18 | SMS gateway: approved OTP template and sender ID, real-phone test (**You**) | 4 · Integrations | S | 🟡 Key works (balance ৳94.05), `npm run sms:test` ready; operator tests by you |
| 19 | Bangla QR image and payment instructions (**You**) | 4 · Integrations | S | 🟡 Admin page ready; the committee enters the real numbers and QR |
| 20 | Online payment gateways | 4 · Integrations | L | ⏭️ Not needed — manual payment chosen |
| 21 | Admin pages usable on phones | 5 · UX | M | ✅ Done 2026-10-12 |
| 22 | Gate scanner with the phone camera | 5 · UX | M | ✅ Code done 2026-10-12 (20-ticket phone run by you) |
| 23 | Join flow tested end to end on real phones | 5 · UX | S | 🟡 Checklist ready (`docs/PHONE_TEST_CHECKLIST.md`); the phone run is yours |
| 24 | Production build passes, warnings cleaned | 6 · Quality | M | ⬜ |
| 25 | Test gaps closed (route handlers, logging) | 6 · Quality | M | ⬜ |
| 26 | Manual QA walkthrough for every role | 6 · Quality | S | ⬜ |
| 27 | Performance pass (images, mobile Lighthouse) | 6 · Quality | M | ⬜ |
| 28 | Server set up (Node, Nginx, PM2, SSL, uploads folder) | 7 · Deploy | M | ⬜ |
| 29 | Production database: back up, rehearse, migrate, seed | 7 · Deploy | M | ⬜ |
| 30 | Backups running and a restore tested | 7 · Deploy | S | ⬜ |
| 31 | Monitoring and alerts | 7 · Deploy | S | ⬜ |
| 32 | Soft launch with the committee | 8 · Launch | S | ⬜ |
| 33 | Public launch | 8 · Launch | S | ⬜ |
| 34 | First-week watch and clean-up | 8 · Launch | S | ⬜ |

---

## Phase 0 — Finish what is in progress

### 1. Finish the activity log · M · ✅ Done 2026-10-11
**Result:** `ActivityLog` table; `lib/activity-log.ts`; every write route logged (sign-in/out and failed sign-ins, joins and registrations with how the contact was verified, SMS and email codes, user management, membership and registration decisions, event changes, bulk SMS, profile/password/photo, payment start/complete/fail/mismatch, gate check-ins, ID card scans, posts, jobs, applications, volunteers, contact messages, direct messages without content, notifications, push); rate-limit hits, refused admin-panel access and super admin sync logged as SECURITY/SYSTEM; `/admin/logs` with category, outcome and text filters; pruning after `LOG_RETENTION_DAYS`; 10 tests. Not logged: the feed "like" button (it saves nothing yet).
**Why:** you asked to track everything; half-done logging gives a false sense of coverage.
**Already done:** `ActivityLog` table, `lib/activity-log.ts` (secret redaction, never breaks a request), sign-in / failed sign-in / sign-out, admin event create/update/delete, registration decisions.
**Tasks:**
- Log the remaining write routes: verifications, user management, bulk SMS, phone/email codes, joining and event registration, profile / password / photo, payments and callbacks, gate check-in, card verify, posts, likes, jobs, applications, volunteers, contact form, messages (without content), notifications, push.
- Log rate-limit hits and refused admin access as SECURITY events; super admin sync and log pruning as SYSTEM events.
- `/admin/logs` page: filter by category and status, search, paging, details panel; link in the admin sidebar.
- Prune entries older than `LOG_RETENTION_DAYS` (default 365) at startup.
- Tests: redaction of secrets, one entry per logged action, failures logged, page access admin-only.
- `npm run db:push` locally; restart `next dev`.

**Done when:** every write route produces an entry; no password, code or token appears in any entry; `/admin/logs` filters work; tests pass.

### 2. Commit the volunteer page fix · S
**Done when:** `/volunteer` shows the header and footer, and the change is committed.

---

## Phase 1 — Decisions (only the committee can make these)

### 3. Hosting, domain and backups · S · **You** · ⏸️ Deferred 2026-10-11 (no domain or hosting yet). Blocks steps 17 (email domain), 28–31 (deploy); everything else can go ahead.
**Why:** member photos and proof documents are stored on the server's disk, so serverless hosting (e.g. Vercel) cannot be used as is.
**Decide:**
- Host: Ubuntu VPS with Nginx + PM2 (recommended) or a cPanel Node.js app. Needs Node 22+, a persistent disk, SSH access.
- Domain, e.g. `alumni.sabujsghs.edu.bd`, and who controls DNS.
- Where backups go (second server, cloud storage, or Google Drive), and who holds the keys.
- If cPanel: confirm it runs a single Node process (rate limits are kept in memory per process).

**Done when:** host, domain and backup location are written into this file.

### 4. Which sections launch · S · **You** · ✅ Decided 2026-10-11: all sections launch — news, gallery, stories & achievements, careers, mentorship and network. Each needs real data (steps 9a–9f).
**Why:** news, stories, achievements, gallery, careers, mentorship and network currently show made-up sample content.
**Decide per section:** launch with real data (more work, step 9) or hide until later (step 6).
**Recommendation:** launch with joining, events/tickets, directory, profiles, ID card, donations info, contact, volunteer; hide careers, mentorship and network; launch news and gallery only if the committee will maintain them.

**Done when:** a launch / hide decision is written here for each section.

### 5. Payments at launch · S · **You** · ✅ Decided 2026-10-11: manual payment and committee verification only; no gateway accounts. Step 20 dropped; step 6a added.
**Options:** (a) manual only — member pays by bKash / Nagad / Bangla QR / bank and enters the transaction ID, committee approves (works today); (b) also online checkout through bKash / Nagad / SSLCommerz merchant APIs (needs merchant accounts and step 20).
**Recommendation:** (a) for launch; add (b) later.

**Done when:** the choice is written here.

---

## Phase 2 — Real data only

### 6. Hide or remove sections not launching · M
**Tasks:** remove hidden sections from the navbar, footer, homepage, sitemap and search; their routes return 404 (or "coming soon"); keep the code for later.
**Done when:** no page a visitor can reach shows sample people, jobs, mentors or stories.

### 6a. Donations page: manual payment · M · ✅ Done 2026-10-11
**Result:** `/donate` records amount, method (bKash, Nagad, Bangla QR, bank, cash) and transaction ID as PENDING, with "How to pay" from `NEXT_PUBLIC_DONATION_INSTRUCTIONS` and the Bangla QR; `/admin/donations` has a "Waiting for verification" queue with Verify / Reject (reason required); only verified donations raise the campaign total, exactly once, and the donor gets a receipt email; a transaction ID cannot be reused across donations and registrations; online checkout returns 410 unless `ONLINE_PAYMENTS_ENABLED=true`; everything is in the activity log; 7 tests.
**Why:** `/donate` currently starts online checkout through bKash / Nagad / SSLCommerz APIs, which the association does not have.
**Tasks:** donation form records the donor, amount, method (bKash, Nagad, Bangla QR, bank, cash) and transaction ID as PENDING; admin donations page gets Verify / Reject (like joining); campaign totals count only verified donations; receipts after verification; hide the online gateway buttons and callback routes (keep the code for later).
**Done when:** a test donation by bKash transaction ID shows as pending, an admin verifies it, and the campaign total updates; no gateway screen is reachable.

### 6b. Contact form reaches the committee · S · ✅ Code done 2026-10-11
**Result:** messages are emailed to `CONTACT_INBOX_EMAIL` with Reply-To the sender (sender text HTML-escaped), and kept in the activity log; same-origin check and field limits; 3 tests. The real-inbox check moves to step 17, when an email provider exists.
**Tasks:** send each contact message to the committee email (after step 17), keep the activity-log entry.
**Done when:** a test message arrives in the committee inbox.

### 7. Volunteers into the database · M · ✅ Done 2026-10-11
**Result:** `Volunteer` table; `lib/volunteers.ts` reads and writes it (same API for the pages); the 5 made-up volunteers are gone; one open application per person and subcommittee (a declined person may apply again); subcommittee validated; applications linked to the signed-in member; who approved/declined and when is stored; the API answers bad input with 400 instead of crashing and checks same-origin; `npm run db:import-volunteers` moves real entries from the old JSON file (run once on the server in step 29); 7 tests.
**Why:** volunteers live in `uploads/volunteers.json`, start with 5 made-up people, and two writes at once can lose data.
**Tasks:** `Volunteer` table; move the API and admin page to it; import any real entries from the JSON file; drop the sample list.
**Done when:** applications survive restarts and concurrent submissions; no sample volunteers anywhere.

### 8. Bulk SMS history into the database · S · ✅ Done 2026-10-11
**Result:** `SmsBroadcast` table via `lib/sms-history.ts`; every send is stored with sender, full recipient list, credits and gateway reply; failed sends that reached the gateway are stored too (status FAILED, shown in red); history badge now says "Accepted by gateway" instead of the misleading "Delivered"; `npm run db:import-sms-history` moves the old file (run once on the server in step 29); 3 tests.
**Tasks:** store each broadcast (sender, count, credits, gateway reply) in a table or as activity-log entries; the SMS page reads from there.
**Done when:** `uploads/sms-history.json` is no longer written.

### 9a. News · ✅ Done 2026-10-12
**Result:** `/admin/news` to write, edit, publish/unpublish, feature and delete articles; image upload through a shared content-image pipeline (`lib/media/content-images.ts`: WebP large + thumbnail, camera/GPS data removed, served at `/api/media/content/...`, reused by 9b and 9c); `/news` shows only published articles (featured first) with an empty state, and each article has its own page `/news/[id]`; article text is plain paragraphs, never HTML; only uploaded images are accepted (no hotlinks); replaced or deleted images are removed from disk; existing rows (seeded samples) became drafts; all actions in the activity log; 8 tests.

### 9b. Gallery · ✅ Done 2026-10-12
**Result:** `/admin/gallery`: create albums (name, category, year, description), add many photos at once with upload progress, captions, choose the cover, publish/unpublish, delete photos or whole albums (files removed from disk); an album needs a photo before it can be published and is unpublished again when emptied; `/gallery` and the homepage show photos from published albums only, with thumbnails in grids and the full image in the lightbox, plus an empty state; existing (seeded) albums became unpublished; actions in the activity log; 5 tests.

### 9c. Stories and achievements · ✅ Done 2026-10-12
**Result:** `/admin/stories` with Stories and Achievements tabs: write, edit, publish/unpublish, feature (stories), delete, with cover/photo upload through the content-image pipeline; `/stories`, `/stories/[id]` (now a server page), `/achievements`, the homepage and the sitemap use published database rows only, with empty states; story text is plain paragraphs, reading time is calculated; fixed achievement categories; existing (seeded) rows became drafts; actions in the activity log; 6 tests.

### 9d. Careers / job board · ✅ Done 2026-10-12
**Result:** `Job` and `JobApplication` tables (`lib/jobs.ts`); only verified members can post, their jobs wait in `/admin/jobs` for approval (admins' own posts go live); admins approve, reject with a reason the poster sees, close or delete; `/careers` and `/careers/[id]` show approved jobs from the database (pending/rejected ones are 404), applications stop after the deadline; applying stores the application (one per email per job, CV must be an https link) and emails the poster with Reply-To the applicant; posters see status and applications in `/careers/mine` and can close their jobs; the sample jobs are gone; all actions in the activity log; 6 tests.

### 9e. Mentorship · ✅ Done 2026-10-12
**Result:** `Mentor` and `MentorshipRequest` tables (`lib/mentorship.ts`); verified members apply at `/mentorship/become` and admins approve, reject (with a reason), hide or relist them at `/admin/mentors`; mentors can pause their own listing; `/mentorship` lists approved mentors only (no fake ratings; "mentees helped" counts accepted requests); signed-in verified members send requests (one open request per mentor, never to themselves), the mentor is emailed and accepts with real meeting details or declines at `/mentorship/mine`, and the mentee is emailed and can cancel; the fake Google Meet links and sample mentors are gone; all actions in the activity log; 6 tests.

### 9f. Network and messages · ✅ Done 2026-10-12
**Decision:** directory-style network (option 1) — no connection requests; connections can be added later.
**Result:** `/network` lists real verified members (never yourself, pending or disabled accounts), searchable by name, profession, company or city, with a batch filter and paging; phone and email only when the member made them public; "View profile" and "Message" on every card. `/messages` rebuilt on the real messaging API: your conversations with names and photos, `/messages?to=<member>` starts a conversation, live updates, unread counts, failed sends shown as "Not sent", phone layout with list/thread switch; fake contacts, connections and call buttons removed. Only active members can receive messages; message notifications open the conversation. 5 tests.

### 9g. Moderators manage content · M · ✅ Done 2026-10-12
**Result:** one permission map (`lib/permissions.ts`): admins and the super admin use every area; moderators use News, Gallery, Stories & Achievements, Jobs, Mentors and the gate scanner only. The admin sidebar shows only allowed sections; `app/admin/template.tsx` checks every page on every navigation (the proxy passes the path), moderators opening `/admin` land on News, and refused pages are logged; the content APIs use `requireArea`, everything else stays admin-only; the member sidebar/header show the admin link to moderators too; the 403 page no longer says "Administrators Only". Test reset made sturdier (60 s transaction). 5 tests.

**Why:** the agreed roles say moderators handle content and gallery, but the admin panel admits admins only.
**Tasks:** a small permission map (`can(role, area)`) used by the admin layout, sidebar and APIs; moderators see News, Gallery, Stories and the gate scanner only.
**Done when:** a moderator can publish news but cannot open users, donations, SMS or logs.

### 9a–9f. Every section from the database · L in total (all launch, step 4)
One sub-step per section: 9a news, 9b gallery, 9c stories & achievements, 9d careers (jobs and applications stored, posts moderated by admins), 9e mentorship (members opt in as mentors; requests stored and emailed, no fake Meet links), 9f network (verified members only, privacy settings respected).
**Tasks:** admin create / edit / publish / delete for each (tables already exist); public pages read published rows; image upload through the existing media pipeline; empty states.
**Done when:** the committee can publish an item from the admin panel and it appears publicly; no sample items remain.

### 10. Remove sample fallbacks · M · ✅ Done 2026-10-12
**Result:** the sample arrays in `lib/data.ts` and `lib/career-data.ts` are gone (types and school details stay); the demo events used by `npm run db:seed` moved to `prisma/demo-events.ts` (step 11 decides what production seeds). **Feed rebuilt** (`lib/feed.ts`): posts, likes (new `PostLike` table, one per member) and comments are stored; authors delete their own, admins and moderators (new "feed" area) delete anyone's; comments notify the post's author; members only. **Batches** (`lib/batches.ts`): every year 1985 to now with real verified-member counts; representative, phone, tagline, description and reunion date set by admins in `/admin/batches` (fake phone numbers and "Golden Jubilee" fallbacks removed). **Dashboard:** real feed, classmates (link to profile and Message), batch rep or "Not assigned yet", donation widget only when a campaign exists; fake name, batch 2008, avatar, "90% profile strength" and "Connect" button removed. **Notifications:** header bell and `/notifications` show the member's real notifications (mark read, links), fake "Dr. Nusrat Jahan" entries removed. No invented batch anywhere: header, sidebar, post composer, job applications, ID card and profile creation no longer default to 2008; gate scanner starts with an empty history. 15 tests.

**Tasks:** feed, dashboard widgets, network, messages and `sitemap.ts` stop mixing in `lib/data.ts` samples; show empty states instead.
**Done when:** a fresh database shows empty states, never invented people.

### 11. Production-safe seed · S · ✅ Done 2026-10-12
**Result:** `npm run db:seed:prod` (`prisma/seed-prod.ts`, shared steps in `prisma/seed-core.ts`) creates the SSC batches 1985 to this year (name only), the super admin from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (required) and the membership event (`prisma/membership-event.ts`, payment instructions left for an admin) — nothing else; existing rows are never overwritten, so it can be re-run. It repairs legacy event/registration rows, disables accounts that still have the old published default passwords, clears the invented batch representatives earlier seeds wrote, and warns about test accounts and demo content still present. `npm run db:seed` (demo data and test accounts) now refuses to run when `NODE_ENV=production`. `npm run db:remove-demo` deletes the demo posts, news, announcements, events and campaigns, keeping events with registrations and campaigns with donations. `docs/DATABASE_SETUP.md` updated. 8 tests.

**Why:** `npm run db:seed` creates sample events, posts, news and test accounts — wrong for production.
**Tasks:** `npm run db:seed:prod` that creates only batches, the super admin (from env) and the real membership event; refuses to create test accounts when `NODE_ENV=production`.
**Done when:** running it on an empty database gives a clean, real-only site.

### 11a. Donation campaigns in admin · M · ✅ Done 2026-10-12
**Result:** `lib/campaigns.ts` + `/api/admin/campaigns` (admins only): create, edit, close, reopen and delete fundraising campaigns from `/admin/donations` (title, category, goal, start and optional end date, banner image through the content-image pipeline). A campaign is **open** only when active, started and not past its end date; only open campaigns appear on `/donate`, the homepage and the dashboard, and only they accept donations. Editing never touches the money raised; a campaign with donations cannot be deleted, only closed. No more invented "45 days" or "0 days remaining" when there is no end date; `/donate` shows an empty state instead of "Loading…" forever. Every change in the activity log. 6 tests.

**Why:** found in step 11 — campaigns can only be created by the demo seed; there is no admin page for them, so a production database would have an empty donations page.
**Tasks:** create / edit / close / delete campaigns in `/admin/donations` (title, description, goal, dates, banner image through the content-image pipeline); deleting is blocked once donations exist; activity log; tests.
**Done when:** the committee can open a campaign from the admin panel and members can donate to it.

---

## Phase 3 — Security

### 12. Secrets and environment · S · ✅ Code done 2026-10-12
**Result:** `lib/env-check.ts` checks a production environment; in production the server refuses to start with a missing, short or published `NEXTAUTH_SECRET`, non-https or local `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` (or different ones), no super admin or a short password, or online payments switched on, and logs warnings for test-account passwords, missing email/SMS/contact/donation/Bangla QR settings and a relative `UPLOADS_DIR`. `npm run env:check -- <file>` runs the same check on an env file (names only, never values). `.env.example` no longer contains a secret; `docs/PRODUCTION_ENV.md` lists every production variable. Git history scanned: no current API key, database URL or super admin password in it; the old example `NEXTAUTH_SECRET` and an old local seed admin password are (both must not be used anywhere). The real values are set on the server in step 28 (hosting deferred). 5 tests.

**Tasks:**
- Generate a new `NEXTAUTH_SECRET` (`openssl rand -base64 32`) for production; replace the fixed example value in `.env.example` with a placeholder.
- Production `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (12+ characters, password manager).
- `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` set to the real domain.
- No seed passwords or test accounts in production env.

**Done when:** production env reviewed line by line against `.env.example`; nothing secret in git.

### 13. Same-origin checks and body limits on all write routes · M · ✅ Done 2026-10-12
**Result:** all 59 write routes checked: the 10 without a same-origin check got one (card and ticket verification, OCR, messages send and mark-read, payment initiation, profile photo upload and removal, password change, push subscribe, event registration); `requireSameOrigin` also refuses `Sec-Fetch-Site: cross-site` and no longer skips itself under tests. JSON bodies are capped at 64 KB (512 KB for news, stories, events, jobs and bulk SMS) and read as a stream, so an oversized body gets 413 and a malformed one 400; the event-registration JSON branch and the SSLCommerz callbacks (exempt from the origin check: the gateway posts them) are capped too. `tests/write-routes.test.ts` fails if a write route is added without the origin check or reads a body without a cap. 5 tests.

**Tasks:** add `requireSameOrigin` to the remaining write routes (profile photo, password, posts, likes, jobs, messages, volunteers, RSVP JSON branch, payments initiate); cap JSON bodies (e.g. 64 KB); malformed bodies return 400, not 500.
**Done when:** every POST/PUT/PATCH/DELETE route (except gateway callbacks) refuses cross-site requests; tests cover a few.

### 14. Dependency audit and security headers · S · ✅ Done 2026-10-12
**Result:** the database driver actually in use was `mariadb` 3.4.5 (SQL-injection and credential-leak advisories): the old nested override never installed, now forced to 3.5.4 everywhere. Overrides for `source-map-js`, `mysql2` and `deepmerge-ts`; Vitest 3 → 4.1.11 (critical advisories in the test runner). `npm audit --omit=dev`: **0**. Left: `braces` (high, no fixed version published) inside ESLint's file matcher, dev-only, matching our own patterns. Headers: `connect-src 'self'` (was any https/ws), `upgrade-insecure-requests`, HSTS one year in production only without `preload`, `X-XSS-Protection: 0`, `Cross-Origin-Opener-Policy`, Permissions-Policy with `camera=(self)` for the gate scanner; checked on the running server and by tests for production and development.

**Tasks:** `npm audit` and update vulnerable packages; review headers in `next.config.ts` (CSP, HSTS, frame-ancestors, referrer policy; allow camera for `/gate` if step 22).
**Done when:** no high or critical advisories; headers verified on a production build.

### 15. Privacy clean-up · S · ✅ Done 2026-10-12
**Result:** `lib/privacy-cleanup.ts` deletes the photo, any leftover proof file and payment screenshots of applicants still rejected `PRIVACY_REJECTED_DAYS` (default 30) after the decision; the account, decision and transaction ID stay. Runs a minute after server start and daily, or `npm run privacy:cleanup`; each run that deletes something is in the activity log (`privacy.rejected_files_purged`, counts only). `docs/DATA_RETENTION.md` lists what personal data is kept, who sees it and for how long.

**Tasks:** delete photos and proof documents of rejected applicants after a set period (e.g. 30 days); document what personal data is kept and for how long.
**Done when:** a scheduled clean-up runs and is logged.

### 16. Known edge cases · S · ✅ Done 2026-10-12
**Result:** the membership flag cannot move (unset, or set on another event) while membership applications are waiting for a decision (409 with how many; other edits still save). `PRODUCTION_DEPLOYMENT.md` updated: one `.env.production` read by Next.js and by the scripts with `NODE_ENV=production`, `env:check`, `db:seed:prod`, Node 24, one PM2 instance, nginx upload size and unbuffered live updates, current security checklist. Moderator 403 wording was done in 9g.

**Tasks:** block changing an event's membership flag while joins are pending (or migrate them); ~~403 page wording for moderators~~ (done in 9g); update the outdated parts of `PRODUCTION_DEPLOYMENT.md`.
**Done when:** each has a test or a manual check written down.

---

## Phase 4 — Integrations

### 17. Email provider · S · **You** · 🟡 Partly done 2026-10-12
**Done:** Resend API key (send-only) in `.env.local`; the association's mailbox `sabujshikshayatanalumni@gmail.com` is the reply-to of every email (`EMAIL_REPLY_TO`), the contact-form inbox (`CONTACT_INBOX_EMAIL`) and the contact address on the site (`NEXT_PUBLIC_CONTACT_EMAIL`: footer, contact page, souvenir call); the made-up `alumni@`/`souvenir@sabujsghs.edu.bd` addresses are gone. Sender is Resend's test address `onboarding@resend.dev`, which **only delivers to the Resend account owner's own address**; the production check warns about it, and `npm run email:test -- <address>` sends a test. Also fixed: a signed-in member volunteering while registering was saved with an invented email, phone ("Registered Attendee") and batch 2010; the server now uses their profile.
**Left:** verify the association's domain in Resend (SPF/DKIM) once the domain exists (step 3), set `RESEND_FROM_EMAIL` to an address on it, then send the four test emails below.
**Tasks:** Resend account; verify the sending domain (SPF, DKIM records in DNS); set `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `CONTACT_INBOX_EMAIL`; send a test approval email, a test email code, a test donation receipt and a test contact-form message.
**Done when:** emails arrive in Gmail's inbox (not spam) from the association's domain.

### 18. SMS gateway · S · **You** · 🟡 Code done 2026-10-12
**Done:** the BulkSMSBD key and sender ID `8809617634722` are set and the key works (balance check: ৳94.05, no SMS sent). `npm run sms:test -- 01XXXXXXXXX` sends one SMS in the exact OTP template (`Your SSGHS Alumni OTP is 1234`, brand from `OTP_BRAND_NAME`) and prints the gateway's answer and the balance.
**Left (you):** confirm with BulkSMSBD that this template and sender ID are approved; run `sms:test` on a Grameenphone, a Robi and a Banglalink number.
**Tasks:** confirm with BulkSMSBD that the OTP template `Your {Brand} OTP is XXXX` and the sender ID are approved; set `OTP_BRAND_NAME` to match; send a code to a Grameenphone, Robi and Banglalink number; one small broadcast; note the balance and how it is topped up.
**Done when:** codes arrive within a minute on all three operators.

### 19. Bangla QR and payment instructions · S · **You** · 🟡 Code done 2026-10-12
**Done:** payment details moved out of env variables into **Admin → Donations → Payment details** (`Setting` table, `lib/payment-settings.ts`): bKash and Nagad numbers with account type, bank account, uploaded Bangla QR image and merchant name, extra note; `/donate` and the join form read them live (no rebuild); every change is in the activity log with old and new values. **Removed a dangerous button** on the event admin page ("Load SSHS Defaults") that filled made-up bKash, Nagad and bank numbers into the payment instructions; it is now "Use association details", which copies the saved real details; `npm run db:seed:prod` warns about any event still showing those made-up numbers (the local membership event has them). Also: the join form no longer pre-selects SSC batch 2010.
**Left (you):** enter the real numbers and upload the bank's QR in Admin → Donations; apply them to the Golden Jubilee event (Admin → Events → Pricing → "Use association details" → Save); pay a small amount by scanning the QR.
**Tasks:** get the bank-issued Bangla QR image; put it in `public/`; set `NEXT_PUBLIC_BANGLA_QR_IMAGE` and `NEXT_PUBLIC_BANGLA_QR_MERCHANT`; write the payment instructions on the membership event (bKash / Nagad numbers, bank account).
**Done when:** a committee member pays a small amount by scanning the QR from the form.

### 20. Online payment gateways · L (only if chosen in step 5)
**Tasks:** merchant credentials; sandbox tests for success, failure, cancel and IPN; switch off sandbox; reconcile with the admin donations page.
**Done when:** a real small payment completes and is recorded automatically.

---

## Phase 5 — Admin and member experience

### 21. Admin pages on phones · M · ✅ Done 2026-10-12
**Result:** every admin page checked at 375 px (no sideways page scroll anywhere). Verifications: the applicant list no longer fills a fixed 750 px box; tapping an applicant scrolls to the review; Approve / Reject stay pinned above the bottom bar while reviewing (the admin layout's content wrapper was a scroll container that broke sticky elements, now `overflow-x-clip`). The wide tables — event attendees and check-in (848 px, "Check in" was off-screen), donations ledger, alumni, volunteers and SMS history — become one card per row below 768 px and stay tables on larger screens; row buttons are at least 40 px tall on phones. **Checked:** a pending join approved end to end at 375 px with a throwaway local applicant (deleted afterwards).

**Tasks:** make verifications, events, registrations, donations, SMS and logs usable at 375 px wide (the users page already is).
**Done when:** a committee member can approve a join from a phone.

### 22. Gate scanner with the camera · M · ✅ Code done 2026-10-12
**Result:** `/gate` rebuilt phone-first. The camera reads QR codes continuously (the browser's own reader on Android Chrome, `jsQR` on iPhone Safari), with a green/red result card, a beep and a vibration; the same code held in view is read once, and scanning pauses 1.5 s after each result. Staff pick the event they are checking in for: a ticket for another event is refused (`WRONG_EVENT`), and a counter shows tickets in / expected and people in. Typing or pasting a code (or a USB/Bluetooth QR reader) still works. Camera allowed by `Permissions-Policy` on `/gate` only. Tests: wrong-event refusal, counts, gate-staff-only access, and that ticket QR codes decode with `jsQR` even from a blurred, dark frame. Checked at 375 px with a throwaway ticket: let in, then refused as already checked in. The camera needs HTTPS: test on a phone with `npm run dev:https` (port 3443, self-signed certificate) or an ngrok address.
**Left (you):** check in 20 tickets from a phone in under 5 minutes.

**Why:** on event day volunteers must scan tickets quickly; today the ticket code is typed or pasted.
**Tasks:** camera QR scanning on `/gate`; allow camera in `Permissions-Policy` for that page only; check-in tied to the event being scanned.
**Done when:** 20 tickets are checked in from a phone in under 5 minutes.

### 23. Join flow on real phones · S · 🟡 Prepared 2026-10-12
**Done:** join form checked at 375 px signed out: nothing scrolls sideways, every field is 16 px or larger (no zoom-in on iPhone), buttons 48 px; phone keyboards and autofill hints for name, email, mobile and roll; HEIC photos (some Android phones, shared iPhone originals) now get a clear "take a screenshot / set the camera to JPEG" message instead of "wrong type"; the SSC batch is no longer pre-filled (step 19). `docs/PHONE_TEST_CHECKLIST.md` is the step-by-step run for both phones and the committee.
**Left (you):** run the checklist on an Android phone and an iPhone over mobile data.
**Tasks:** complete a join on Android Chrome and iPhone Safari over mobile data: photo, proof, SMS code (and email fallback), Bangla QR / bKash, transaction ID.
**Done when:** both phones finish without help, and the committee approves both.

---

## Phase 6 — Quality gates

### 24. Production build · M
**Tasks:** `npm run build` passes; fix type, lint and build warnings that matter; `npm start` serves the build locally.
**Done when:** a clean build and a smoke check of the main pages on `npm start`.

### 25. Test gaps · M
**Tasks:** route-handler tests for media admin gate, verification 409, logging entries per action, email fallback through the form API. Make the timing-sensitive tests robust: under heavy machine load (2026-10-12) the concurrent APPROVE/CANCEL race test and the joining tests timed out once, then passed on re-run.
**Done when:** `npm test` passes and the listed gaps have tests.

### 26. Manual QA by role · S
**Tasks:** written checklist, run once per role: visitor, alumni (pending → verified), moderator (gate), admin (approve, events, SMS), super admin (users, logs).
**Done when:** every line passes; issues found become their own steps.

### 27. Performance · M
**Tasks:** `next/image` for large images; check bundle size; mobile Lighthouse on home, join and directory.
**Done when:** mobile Lighthouse performance ≥ 80 on those pages.

---

## Phase 7 — Deploy

### 28. Server set-up · M
**Tasks:** Node 22+, Nginx, PM2 (with log rotation), Certbot SSL; `npm ci` on the server (never copy `node_modules`); `UPLOADS_DIR` outside the web root, owned by the app user, `chmod 700`; `.env.local` with production values; firewall (SSH, HTTP, HTTPS only).
**Done when:** the site loads over HTTPS on the real domain, and `/api/media/...` files are not reachable directly.

### 29. Production database · M
**Tasks:** full backup of the current remote database; restore it into a copy and run `npm run db:push` there first (rehearsal); then the real `db:push`, `npm run db:import-volunteers` and `npm run db:import-sms-history` (if the server has the old JSON files) and the production seed (step 11); confirm the super admin can sign in.
**Done when:** production schema matches, existing data is intact, super admin signs in.

### 30. Backups · S
**Tasks:** daily database dump and `UPLOADS_DIR` copy to the location chosen in step 3; keep 30 days; restore one backup onto a test database.
**Done when:** a restore has actually been done once.

### 31. Monitoring · S
**Tasks:** uptime check (e.g. UptimeRobot) on the home page; PM2 restarts on crash; weekly look at `/admin/logs` for failures; SMS balance check.
**Done when:** a stopped server triggers an alert to a committee phone or email.

---

## Phase 8 — Launch

### 32. Soft launch · S
**Tasks:** 5–10 committee members join for real, pay, get approved, receive tickets; collect problems.
**Done when:** all problems found are fixed or scheduled.

### 33. Public launch · S
**Tasks:** announcement by bulk SMS and email; link on the school website and social media.
**Done when:** announcement sent; first public joins approved.

### 34. First-week watch · S
**Tasks:** check `/admin/logs` daily for failed sign-ins, rate limits and errors; check SMS balance; disable any test or seed accounts left in production; rotate the super admin password after launch.
**Done when:** a week with no unresolved incidents.
