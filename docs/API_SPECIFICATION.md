# API & Server Action Specification

**SSGHS Alumni Association**
(Sabuj Shikshayatan Government High School, Chattogram)
Website: [https://sabujsghs.edu.bd/](https://sabujsghs.edu.bd/)

This document specifies the endpoints and Server Actions used for client-server communication, authentication, community interaction, and admin management.

---

## 🔐 1. Authentication Endpoints

### `POST /api/auth/register`
Registers a new alumnus with verification information.

### `POST /api/auth/login`
Authenticates an existing user and returns session information.

---

## 👥 2. Alumni Directory & Profile Endpoints

### `GET /api/alumni`
Query the alumni directory with filters (`q`, `batch`, `profession`, `location`, `verified`).

---

## 💬 3. Community Feed & Messaging

### `POST /api/feed/posts`
Creates a new post on the alumni timeline.

---

## 📅 4. Events & Reunions

### `GET /api/events`
Fetch upcoming and past school and alumni events.

### `POST /api/events/:id/rsvp`
Registers the authenticated user for an event.

---

## 💰 5. Donation Initiatives

### `GET /api/donations/campaigns`
Fetches transparent fundraising campaigns.

---

## 🛡️ 6. Admin Endpoints

### `GET /api/admin/verifications`
Retrieves pending alumni verification requests.
