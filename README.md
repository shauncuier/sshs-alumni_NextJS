# SSGHS Alumni Association
### Sabuj Shikshayatan Government High School, Chattogram

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-MariaDB-4479a1?style=flat&logo=mysql)](https://www.mysql.com/)

A premium, modern, production-grade **School Alumni Management and Community Web Application** built specifically for the **SSGHS Alumni Association** (Sabuj Shikshayatan Government High School / সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়), Chattogram, Bangladesh.

Official School Website: [https://sabujsghs.edu.bd/](https://sabujsghs.edu.bd/)  
EIIN: **105070**

---

## 📚 Complete Project Documentation (`docs/`)

All technical and operational documentation has been organized into the [`docs/`](./docs/) directory:

- [**Milestones, Live Status & AI Error Log**](./docs/PROJECT_MILESTONES_AND_STATUS.md): Master progress tracker, live running services, completed modules, and structured AI error incident log.
- [**System Architecture & Technical Specs**](./docs/ARCHITECTURE.md): Client layer, component hierarchy, entity models, and role-based permissions.
- [**MySQL / MariaDB Database Guide**](./docs/DATABASE_SETUP.md): Connection string, creating tables, seed data, and table reference.
- [**Production Deployment Guide**](./docs/PRODUCTION_DEPLOYMENT.md): Production hardening, Nginx, PM2, Vercel, Docker, and backup procedures.
- [**API & Server Action Specifications**](./docs/API_SPECIFICATION.md): Data contracts and endpoints for authentication, directory, feed, events, donations, and admin management.
- [**Project Roadmap**](./docs/PROJECT_ROADMAP.md): Release phases, payment gateways (bKash/Nagad), and digital alumni ID cards.
- [**Contributing Guidelines**](./docs/CONTRIBUTING.md): Code conventions, design tokens, and standards for alumni volunteers and developers.
- [**Implementation Plan**](./docs/IMPLEMENTATION_PLAN.md): Approved technical plan.

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛️ Major Platform Sections

- **Public Portal**: Homepage, About Association, School Legacy, Alumni Directory (search & multi-filtering), Batches (1985-2025), Events & RSVP, Stories, Achievements Hall of Fame, Photo Gallery with Lightbox, Transparent Donation Campaigns, and Contact Secretariat.
- **Authenticated Alumni Community**: Personalized Dashboard, LinkedIn-style profile, Community Social Feed (with image/post creation, likes, comments), Direct Messages, Classmate Network, Notifications, and Privacy Settings.
- **Administrative Control Center**: Executive KPI Dashboard, Alumni Verification Queue (Approve/Reject), Batch coordination, Event publishing, and Donation tracking.

---

## 📄 License & Ownership

Developed for the **SSGHS Alumni Association**. All rights reserved © 2026.

---

## 🎨 Credits

This platform is designed and developed by **[3s-Soft](https://3s-soft.com)** for the SSGHS Alumni Association.
