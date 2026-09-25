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

## 📍 Phase 3: Digital Alumni Smart Card & Mobile App
- [ ] **Digital Alumni ID Card**:
  - Dynamically generated pass with unique QR Code.
  - Scan-to-verify identity at school gate and official reunion registration counters.
  - Apple Wallet & Google Wallet pass integration.
- [ ] Progressive Web App (PWA) with offline batch directory caching and push notifications.
