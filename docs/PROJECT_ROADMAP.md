# Project Roadmap & Future Enhancements

**SSGHS Alumni Association**
(Sabuj Shikshayatan Government High School, Chattogram)
Website: [https://sabujsghs.edu.bd/](https://sabujsghs.edu.bd/)

---

## 📍 Phase 1: Foundation & Community Launch (Current MVP)
- [x] Official Brand Identity for SSGHS Alumni Association (Forest Green, Emerald, Gold).
- [x] Next.js 15+ App Router architecture with Tailwind CSS v4 and Framer Motion.
- [x] Complete Public Portal (Homepage, About, School History, Directory, Batches, Events, Stories, Achievements, Gallery with Lightbox, Donations, Contact).
- [x] Authenticated Alumni Suite (Member Dashboard, LinkedIn-style profile, Community Feed with posts/likes/comments, Direct Messaging, Network connections, Settings).
- [x] Admin Management Center (Verification queue with Approve/Reject, Batch manager, Event manager, Donation manager, CMS).
- [x] MongoDB & MongoDB Compass readiness with Prisma Schema and Seed scripts.
- [x] Comprehensive Markdown project documentation in `docs/`.
- [x] Master Tracking & AI Incident Ledger: [`PROJECT_MILESTONES_AND_STATUS.md`](../PROJECT_MILESTONES_AND_STATUS.md).

---

## 📍 Phase 2: Payment Gateways & Real-Time Sync ✅
- [x] Integration with Bangladeshi Payment Gateways:
  - **bKash Tokenized Checkout API** (Token caching, create/execute/query lifecycle)
  - **Nagad Merchant API** (RSA encryption, PG challenge protocol)
  - **SSLCommerz / Shurjopay** (Cards, Internet banking, Rocket, Upay, IPN webhook)
- [x] Real-time SSE (Server-Sent Events) engine for instantaneous Direct Messaging and live notification sync.
- [x] Transactional Email service (Resend / Nodemailer / Console) with branded HTML templates.

---

## 📍 Phase 3: Digital Alumni Smart Card & Mobile App ✅
- [x] **Digital Alumni ID Card**:
  - Dynamically generated pass with unique QR Code (`/card` and `DigitalAlumniCard.tsx`).
  - Scan-to-verify identity at school gate and official reunion registration counters (`/verify/[token]` and `/admin/gate-verify`).
  - Apple Wallet (.pkpass JSON manifest) & Google Wallet pass integration (`/api/alumni/card/wallet/*`).
- [x] Progressive Web App (PWA) with offline batch directory caching, `public/sw.js` service worker, and web push notifications (`/api/push/subscribe`, `/api/push/send`).

---

## 📍 Phase 4: Career & Mentorship Network + Reunion Ticketing Ecosystem ✅
- [x] **Alumni Career Hub & Job Portal**:
  - Job & internship listings posted by alumni employers with application tracking (`/careers`, `/careers/[id]`, `/careers/new`, `/api/jobs`).
  - Resume drop, skill tag filters, salary indicators, location (Chattogram, Dhaka, Remote, Global).
- [x] **1-on-1 Alumni Mentorship Matching**:
  - Senior mentors across BCS Cadre, Medicine, Engineering, Software/AI, Corporate, and European academia (`/mentorship`, `/api/mentorship`).
  - Mentorship request & scheduling flow with automated Google Meet room link generation.
- [x] **Reunion Ticketing & Merchandise System**:
  - Tiered registration: Alumnus Delegate, Couple/Family, Golden Jubilee VIP Patron, Sponsor a Retired Teacher (`/events/[id]/ticket`, `/api/events/[id]/ticket`).
  - T-shirt / souvenir size selector (S, M, L, XL, XXL) & dietary preferences (Traditional Mezban Halal, Diabetic, Veg).
  - Automated seat/table assignment with printable ticket pass & gate verification QR code.

---

## 📍 Phase 5: Golden Jubilee Digital Archive & School Endowment Fund
- [ ] Historical photo archive by batch (1975–2025) with high-res zoom & community tagging.
- [ ] Retired teachers tribute wall & emergency healthcare fund ledger.
- [ ] Public audited endowment fund financials & annual balance sheet viewer.

