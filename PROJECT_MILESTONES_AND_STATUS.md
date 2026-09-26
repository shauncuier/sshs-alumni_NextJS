# SSGHS Alumni Platform — Milestones, Live State & AI Error Log

> **Sabuj Shikshayatan Government High School (SSGHS) Alumni Association**  
> **EIIN**: 105070 | **Location**: Chattogram, Bangladesh  
> **Official School Website**: [sabujsghs.edu.bd](https://sabujsghs.edu.bd/)  
> **Last Updated**: 2026-09-26  
> **Maintainer / System Role**: Full-Stack AI Engineer & Alumni Tech Secretariat  

---

## 🧭 Document Purpose & AI Directives

This document is the **single source of truth** for project milestones, component completion status, currently running services, and structured error logs.

> [!IMPORTANT]
> **Instructions for Future AI Agents:**
> 1. When you start or resume a session, consult the **[Current Live Environment & Services](#-current-live-environment--services)** section to know what services are active.
> 2. When you finish any feature or bug fix, update the corresponding milestone in **[Milestones & Implementation Progress](#-milestones--implementation-progress)** to `[x]` with completion date and notes.
> 3. Whenever an error, deprecation, or bug occurs, append an entry to **[Structured AI Error & Incident Log](#-structured-ai-error--incident-log)** following the exact standardized format so subsequent AI models can immediately diagnose and resolve issues without repeat troubleshooting.

---

## ⚡ Current Live Environment & Services

| Service / Component | Target Host / Port | Current Status | PID / Process Details | Notes & Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **MongoDB Daemon** | `127.0.0.1:27017` | 🟢 **RUNNING** | `mongod` (PID: 5368) | Database name: `sshs_alumni`. Test: `Get-NetTCPConnection -LocalPort 27017` |
| **Next.js App Server** | `http://localhost:3000` | 🟡 **READY** | Dev server command: `npm run dev` | Production build verified (`next build` exited code 0, **58 routes** generated across 3 phases) |
| **Prisma ORM Client** | `v7.10.0` | 🟢 **COMPILED** | Client generated in `node_modules/@prisma/client` | MongoDB connector validated with 13 data models (11 core + `PaymentTransaction` + enhanced `Donation`) |
| **Payment Gateway Suite** | `/api/payments/*` | 🟢 **ACTIVE** | bKash + Nagad + SSLCommerz | Sandbox mode by default. Set `BKASH_SANDBOX=false` for production. 7 API routes. |
| **SSE Real-Time Engine** | `/api/realtime/stream` | 🟢 **ACTIVE** | Server-Sent Events with heartbeat | No external deps. Client hook: `useRealtime(userId)`. Direct messaging & live alerts wired. |
| **Digital Smart ID Card** | `/card` & `/verify/*` | 🟢 **ACTIVE** | HMAC-SHA256 Token Signature + QR Generator | 3D Flippable card, Gate Scanner (`/admin/gate-verify`), Apple & Google Wallet pass APIs. |
| **Progressive Web App** | `public/sw.js` | 🟢 **ACTIVE** | PWA Service Worker + Web Manifest | Offline batch directory cache, offline campus banner, web push notifications (`/api/push/*`). |
| **Email Service** | Resend / SMTP / Console | 🟡 **READY** | Auto-detects provider from env vars | Console fallback active until `RESEND_API_KEY` or `SMTP_HOST` is set. |
| **NextAuth.js Session** | `/api/auth/*` | 🟢 **ACTIVE** | JWT Session Strategy with bcrypt credentials | Configured in `app/api/auth/[...nextauth]/route.ts` |
| **Tailwind CSS Engine** | `@tailwindcss/postcss v4` | 🟢 **OPERATIONAL** | Turbo & PostCSS pipeline active | Global theme tokens defined in `app/globals.css` |

### Environment Configuration Summary
- `.env` points to `mongodb://localhost:27017/sshs_alumni`
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000`
- `NEXTAUTH_SECRET`: Configured for session hashing
- Production Build: 58 routes generated statically or dynamically on-demand

---

## 🏆 Milestones & Implementation Progress

### 📍 Phase 1: Core Platform & Launch MVP (Status: 100% Completed)

- [x] **Milestone 1.1: Core Architecture & Design System**
  - **Finished**: 2026-09-24
  - **Details**: Built on Next.js 16+ App Router, React 19, Tailwind CSS v4, Lucide icons, and Framer Motion animations. Forest Green (`#064e3b`), Emerald (`#059669`), and Academic Gold (`#d97706`) brand color palette.
  - **Key Files**: `app/globals.css`, `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`.

- [x] **Milestone 1.2: MongoDB & Prisma Schema Modeling**
  - **Finished**: 2026-09-24
  - **Details**: 11 collections defined in `prisma/schema.prisma` (`User`, `AlumniProfile`, `Batch`, `Post`, `Comment`, `Event`, `EventRegistration`, `DonationCampaign`, `Donation`, `Message`, `Notification`, `VerificationRequest`).
  - **Key Files**: `prisma/schema.prisma`, `lib/prisma.ts`, `prisma/seed.ts`.

- [x] **Milestone 1.3: Role-Based Access Control (RBAC) & NextAuth**
  - **Finished**: 2026-09-25
  - **Details**: Multi-role support (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `ALUMNI`). Secure bcryptjs password hashing. Credentials provider with role-based dashboard redirection.
  - **Key Files**: `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`, `middleware.ts`.

- [x] **Milestone 1.4: Public Portal Pages & Dynamic Directories**
  - **Finished**: 2026-09-25
  - **Details**:
    - **Home**: Hero banner, quick stats, upcoming events, featured alumni spotlight, urgent donation campaigns.
    - **About & School Legacy**: History of Sabuj Shikshayatan, headmaster tribute, campus timeline, EIIN 105070 data.
    - **Alumni Directory**: Instant client-side & server search, filtering by graduation batch (1985–2025), profession, location.
    - **Batch Pages**: Dynamic `/batches/[year]` routes with batch representative info and classmate listings.
    - **Events**: Event showcase with RSVP modal and category filters (`REUNION`, `SPORTS`, `WEBINAR`, `CULTURAL`).
    - **Stories & Achievements**: Alumni memoirs, notable alumni hall of fame, and interactive photo gallery lightbox.
    - **Donation Portal**: Cause-based fundraising cards (STEM Lab, Scholarship, Campus Development) with progress bars.
    - **Contact**: Secretariat inquiry form with direct email action.
  - **Key Files**: `app/(public)/*`, `components/directory/*`, `components/events/*`.

- [x] **Milestone 1.5: Authenticated Alumni Suite**
  - **Finished**: 2026-09-25
  - **Details**:
    - **Dashboard**: Quick metrics, upcoming RSVPs, batch announcements, and classmate suggestions.
    - **LinkedIn-Style Profile**: Work experience, education, skills tags, social links, contact privacy toggles.
    - **Community Social Feed**: Post creation with image attachment, instant like toggles, threaded comments.
    - **Direct Messaging**: Conversation sidebar, interactive chat box, timestamped message exchanges.
    - **Classmate Network**: Batchmate discovery and connection invites.
    - **Settings**: Profile visibility controls, notification preferences, password updates.
  - **Key Files**: `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/feed/page.tsx`, `app/messages/page.tsx`, `app/network/page.tsx`, `app/settings/page.tsx`.

- [x] **Milestone 1.6: Admin Control Center & Verification Pipeline**
  - **Finished**: 2026-09-25
  - **Details**: Executive analytics dashboard, verification queue with one-click Approve/Reject actions, batch coordinator assignment, event publisher, and donation ledger.
  - **Key Files**: `app/admin/page.tsx`, `app/admin/alumni/page.tsx`, `app/admin/events/page.tsx`, `app/admin/donations/page.tsx`, `app/admin/batches/page.tsx`, `app/api/admin/verifications/route.ts`.

- [x] **Milestone 1.7: 50th Golden Jubilee Event Studio & Special Anniversary Modules**
  - **Finished**: 2026-09-26
  - **Details**: Dedicated Golden Jubilee celebration hub, commemorative digital badge, reunion registration flow, and text rendering stability optimizations.
  - **Git Commit**: `4823130`

---

### 📍 Phase 2: Payment Gateways & Real-Time Sync (Status: ✅ Completed)

- [x] **Milestone 2.1: Bangladeshi Payment Gateways Integration**
  - **Finished**: 2026-09-26
  - **Details**:
    - ✅ **bKash Tokenized Checkout API** — Token caching, create/execute/query payment lifecycle. Sandbox and production URL switching via `BKASH_SANDBOX` env var.
    - ✅ **Nagad Merchant API** — RSA public key encryption, private key signing, init/complete/verify flow with PG challenge protocol.
    - ✅ **SSLCommerz Payment Aggregator** — Session initiation, IPN webhook with MD5 hash validation, success/fail/cancel handlers. Supports Visa, Mastercard, Rocket, Upay, Internet Banking.
    - ✅ **Unified Payment Service** — Single `initiatePayment()` entry point that routes to correct gateway based on user selection. Bank transfer and manual modes supported.
    - ✅ **Prisma Schema Updates** — New `PaymentStatus` & `PaymentGateway` enums, enhanced `Donation` model with gateway tracking fields, new `PaymentTransaction` audit model.
    - ✅ **Full API Route Suite** — `/api/payments/initiate`, `/api/payments/bkash/callback`, `/api/payments/nagad/callback`, `/api/payments/sslcommerz/{success,fail,cancel,ipn}`.
    - ⏳ PDF receipt generation with QR code deferred to Phase 3.1 (Digital Smart ID Card).
  - **Key Files**: `lib/payments/bkash.ts`, `lib/payments/nagad.ts`, `lib/payments/sslcommerz.ts`, `lib/payments/index.ts`, `lib/payments/types.ts`, `app/api/payments/*/route.ts`, `prisma/schema.prisma`.

- [x] **Milestone 2.2: Live Real-Time Engine (SSE)**
  - **Finished**: 2026-09-26
  - **Details**:
    - ✅ **Server-Sent Events (SSE)** real-time system — zero external dependencies (no Pusher/Socket.io needed for MVP).
    - ✅ **Per-user connection registry** with automatic cleanup on disconnect.
    - ✅ **Event types**: `new_message`, `message_read`, `typing_start/stop`, `new_notification`, `new_post`, `post_liked`, `payment_update`, `announcement`, `heartbeat`.
    - ✅ **SSE stream endpoint** at `/api/realtime/stream?userId=xxx` with 30s heartbeat keep-alive.
    - ✅ **React hook** `useRealtime(userId)` — auto-connect, auto-reconnect on failure, provides `isConnected`, `lastMessage`, `lastNotification`, `unreadMessageCount`, `unreadNotificationCount`.
    - ✅ **Messages API** at `/api/messages` — GET conversations/threads, POST with real-time push, PATCH read receipts.
    - ✅ **Notifications API** at `/api/notifications` — GET with unread count, POST with SSE push, PATCH individual/bulk read marking.
    - ✅ **Online presence** — `isUserOnline()`, `getOnlineUserIds()` utilities.
  - **Key Files**: `lib/realtime.ts`, `lib/hooks/useRealtime.ts`, `app/api/realtime/stream/route.ts`, `app/api/messages/route.ts`, `app/api/notifications/route.ts`.

- [x] **Milestone 2.3: Transactional Email Service**
  - **Finished**: 2026-09-26
  - **Details**:
    - ✅ **Multi-provider email service** — Resend API (primary), Nodemailer/SMTP (fallback), Console (dev mode). Auto-detects provider from env vars.
    - ✅ **Branded HTML email templates**: Verification Approval, Donation Receipt Confirmation, Event RSVP Confirmation.
    - ✅ **Environment variables** configured in `.env` and `.env.example` for Resend, SMTP, and Bangladesh SMS gateway.
    - ⏳ SMS gateway integration (Greenweb/Reve SMS) ready for wiring — env vars and service skeleton in place.
  - **Key Files**: `lib/email.ts`, `.env`, `.env.example`.

---

### 📍 Phase 3: Digital Smart Alumni Card & Mobile Ecosystem (Status: ✅ Completed)

- [x] **Milestone 3.1: Digital Smart ID Card with Encrypted QR Verification**
  - **Finished**: 2026-09-26
  - **Details**:
    - ✅ **Cryptographic ID Token Signing**: Built `lib/id-card.ts` using HMAC-SHA256 signature to guarantee credential authenticity and prevent ticket/pass forgery at reunion events.
    - ✅ **Interactive 3D Flippable Smart ID Card**: Created `components/card/DigitalAlumniCard.tsx` with high-resolution QR code, school crest, EIIN 105070 watermark, graduation batch typography, blood group, and lifetime membership status.
    - ✅ **Member Card Portal**: Built `app/card/page.tsx` for card view, flip preview, print styling, link sharing, and pass saving.
    - ✅ **Public Gate Verification Page**: Built `app/verify/[token]/page.tsx` for gate security & reunion volunteers with instant alumnus authentication, batch check, and "Check-in Alumnus" confirmation.
    - ✅ **Admin / Volunteer Gate QR Scanner**: Built `app/admin/gate-verify/page.tsx` with optical camera scanner viewfinder, manual token lookup, test scan simulator, and live verified delegate ledger.
    - ✅ **Apple Wallet & Google Wallet Pass Endpoints**: Built `/api/alumni/card/wallet/apple` (.pkpass JSON manifest) and `/api/alumni/card/wallet/google` (Save to Google Pay payload).
  - **Key Files**: `lib/id-card.ts`, `components/card/DigitalAlumniCard.tsx`, `app/card/page.tsx`, `app/verify/[token]/page.tsx`, `app/admin/gate-verify/page.tsx`, `app/api/alumni/card/*/route.ts`.

- [x] **Milestone 3.2: Progressive Web Application (PWA) & Offline Directory**
  - **Finished**: 2026-09-26
  - **Details**:
    - ✅ **App Manifest**: Created `app/manifest.ts` configured for standalone PWA mode with Sabuj Shikshayatan branding (`#064e3b`), icons, and shortcuts (`/card`, `/alumni`, `/feed`, `/events`).
    - ✅ **Service Worker**: Created `public/sw.js` with offline shell caching, stale-while-revalidate for directories and images, network-first fallbacks, and web push handlers.
    - ✅ **Offline Batch Directory Storage**: Created `lib/offline-storage.ts` to cache batch member lists with 7-day TTL so alumni can query classmates offline on campus.
    - ✅ **PWA Provider & Prompt**: Created `components/pwa/PwaProvider.tsx` in `app/layout.tsx` with offline detection banner and "Install SSGHS Alumni App" prompt.
    - ✅ **Web Push Notification Engine**: Created `/api/push/subscribe` and `/api/push/send` endpoints for instant school & reunion announcements.
  - **Key Files**: `app/manifest.ts`, `public/sw.js`, `lib/offline-storage.ts`, `components/pwa/PwaProvider.tsx`, `app/api/push/*/route.ts`.

---

## 📋 Structured AI Error & Incident Log

Use this format to log any issues, build warnings, runtime catches, or API breakages. This enables any future AI session to recognize patterns, avoid regression, and apply known fixes immediately.

```markdown
### [LOG-XXX] <Concise Title of Issue>
- **Timestamp**: YYYY-MM-DD HH:MM (Local)
- **Component / File**: `path/to/file.tsx`
- **Severity**: CRITICAL | HIGH | WARNING | RESOLVED | INFORMATIONAL
- **Error Signature**: Exact console error message or stack trace snippet.
- **Root Cause**: Explanation of why the error happened.
- **Resolution / Workaround**: Specific steps taken or recommended to fix.
- **AI Prevention Rule**: Instruction for future AI models to avoid recurrence.
```

---

### [LOG-001] Next.js 16.3.6 Turbopack Middleware Convention Deprecation
- **Timestamp**: 2026-09-26 03:40 (Local)
- **Component / File**: `middleware.ts`
- **Severity**: WARNING
- **Error Signature**:
  ```text
  ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
    To migrate automatically, run:
    npx @next/codemod@canary middleware-to-proxy .
    Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
  ```
- **Root Cause**: Next.js 16+ Turbopack introduces `proxy` convention in favor of legacy edge middleware for certain routing pipelines.
- **Resolution / Workaround**: The build successfully compiles and `middleware.ts` operates normally in compatibility mode. When ready to upgrade to canary conventions, execute `npx @next/codemod@canary middleware-to-proxy .` or migrate route protection into proxy layout guards.
- **AI Prevention Rule**: Do not delete `middleware.ts` without testing NextAuth JWT session validation across protected routes (`/dashboard`, `/profile`, `/admin/*`).

---

### [LOG-002] MongoDB Connection Pre-requisite for Database Commands
- **Timestamp**: 2026-09-26 03:41 (Local)
- **Component / File**: `prisma/schema.prisma`, `.env`, `lib/prisma.ts`
- **Severity**: INFORMATIONAL / RESOLVED
- **Error Signature**:
  ```text
  PrismaClientInitializationError: Can't reach database server at `localhost:27017`
  ```
- **Root Cause**: MongoDB daemon (`mongod`) must be running before running `npm run db:push`, `npm run db:seed`, or server actions interacting with Prisma.
- **Resolution / Workaround**:
  1. Verified `mongod` is running on port 27017 (PID: 5368).
  2. If down, start MongoDB via Windows Service: `Start-Service MongoDB` or launch `mongod --dbpath <data-directory>`.
  3. Inspect connectivity using: `Get-NetTCPConnection -LocalPort 27017`.
- **AI Prevention Rule**: Always verify MongoDB port 27017 is listening before executing Prisma seed or database queries.

---

### [LOG-003] React 19 Client Component Hydration with Browser APIs
- **Timestamp**: 2026-09-25 18:30 (Local)
- **Component / File**: `components/gallery/Lightbox.tsx`, `components/layout/Navbar.tsx`
- **Severity**: RESOLVED
- **Error Signature**:
  ```text
  Hydration failed because the server-rendered HTML didn't match the client.
  ```
- **Root Cause**: Direct access to `window.innerWidth` or `localStorage` during initial server render pass before mount.
- **Resolution / Workaround**: Guard browser-only properties inside `useEffect` or use state initialized to default constants, e.g. `const [isMounted, setIsMounted] = useState(false)`.
- **AI Prevention Rule**: In React 19 / Next.js App Router, ensure all interactive components accessing browser globals specify `'use client'` at line 1 and defer client-only states until after component mount.

---

### [LOG-004] Seed Data Duplication Protection in MongoDB
- **Timestamp**: 2026-09-25 20:15 (Local)
- **Component / File**: `prisma/seed.ts`
- **Severity**: RESOLVED
- **Error Signature**:
  ```text
  Unique constraint failed on the fields: (`email`)
  ```
- **Root Cause**: Re-running `npm run db:seed` when demo alumni records already existed in MongoDB.
- **Resolution / Workaround**: In `prisma/seed.ts`, use `upsert` queries or clean up test records prior to re-seeding: `await prisma.user.deleteMany({ where: { email: { in: seedEmails } } })`.
- **AI Prevention Rule**: Always use idempotent seeding patterns (`upsert` or check-before-create) for MongoDB Prisma scripts.

---

## 🛠️ Quick Verification Commands for AI & Developers

Run these PowerShell commands in `d:\SaaS Project\sshs-alumni`:

```powershell
# 1. Check if MongoDB is listening
Get-NetTCPConnection -State Listen -LocalPort 27017

# 2. Check if Next.js Dev Server is running
Get-NetTCPConnection -State Listen -LocalPort 3000

# 3. Test production build integrity
npm run build

# 4. Check git status
git status

# 5. Start dev server
npm run dev
```

---

## 📌 Protocol for Updating This Document

1. **When completing a task/feature**:
   - Locate the milestone under **Phase 2** or **Phase 3**.
   - Mark `[x]`, record the finish date, list modified files, and describe key implementation highlights.
2. **When detecting an error**:
   - Add a new numbered log item `[LOG-00X]` under **Structured AI Error & Incident Log**.
   - Include exact error messages and clear AI prevention instructions.
3. **Keep this document clean, well-formatted, and synchronized with `docs/PROJECT_ROADMAP.md` and `README.md`.**
