# API & Server Action Specification

**SSGHS Alumni Association**
(Sabuj Shikshayatan Government High School, Chattogram)
Website: [https://sabujsghs.edu.bd/](https://sabujsghs.edu.bd/)

This document specifies the endpoints and Server Actions used for client-server communication, authentication, community interaction, and admin management.

---

## 🔐 1. Authentication Endpoints

### `POST /api/auth/register`
**Removed.** Always returns `410` with `{ "error": "Join the association through the Golden Jubilee registration.", "code": "JOIN_THROUGH_JUBILEE" }`. Joining is the paid membership registration, `POST /api/events/[slug]/rsvp` (see section 4).

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

## 📅 4. Events & Registration

Events, registrations and tickets live in the database. Every error response has the shape `{ "error": string, "code"?: string }` with the HTTP status shown; `code` is present for expected failures and absent for the generic `500` ("Something went wrong. Please try again."). Admin routes sit under `/api/admin/events` because Next.js cannot have `app/api/events/[id]` beside `app/api/events/[slug]`; the old `/api/events/[id]`, `/api/events/[id]/rsvp` and `/api/events/[id]/ticket` routes no longer exist.

Common types (`lib/events/types.ts`):

- `PublicEvent` - the event fields the pages use (title, date, location, agenda, etc.) plus `slug`, `packages: PublicPackage[]` (`name`, `price` display string, `priceAmount`, `description`, `includes`, `isPopular`, `adults`, `children`, `guestsFree`), `placesLeft`, `isRegistrationOpen` (computed: switch, deadline, capacity and payment details), `closedReason`/`closedMessage` (null while open), `registrationEnabled` (the admin's stored switch), `isMembershipEvent`, `registrationFeeAmount`, `extraAdultFee`, `childFee`, `paymentInstructions`. Prices are whole taka.
- `MemberRegistration` - `id`, `eventId`, `eventSlug`, `eventTitle`, `eventDate`, `status` (`PENDING_PAYMENT` | `CONFIRMED` | `CHECKED_IN` | `CANCELLED`), `isMembershipEvent`, `packageName`, `headCount`, `totalFee`, `donationAmount`, `paymentMethod`, `transactionId`, `createdAt`, `ticket` (`{ qrText, qrDataUrl }` or `null`).
- `AdminRegistration` - the registration plus attendee details: `userId`, `name`, `email`, `phone`, `batch`, `rollNumber`, `section`, `membershipStatus` (`PENDING` | `VERIFIED` | `REJECTED`), `extraAdults`, `extraChildren`, `tshirtSize`, `mealPreference`, `confirmedBy`, `confirmedAt`, `checkedInAt`.

### `GET /api/events`
Public. `200 { events: PublicEvent[] }`.

### `GET /api/events/[slug]`
Public. `200 { event: PublicEvent }`; `404 { error: "Event not found." }`.

### `GET /api/events/membership`
Public. The event flagged as the membership (join) event. `200 { event: PublicEvent }`; `404 { error: "Membership registration opens soon." }`.

### `GET /api/events/[slug]/rsvp`
The signed-in member's registration for the event. `200 { registration: MemberRegistration | null }` (`null` when signed out or not registered).

### `POST /api/events/[slug]/rsvp`
Registers for an event. Signed-in members send only `rsvp`; signed-out visitors may also send `account` to create their account in the same request (ignored when signed in; used for the membership event).

Body:
```json
{
  "account": { "fullName": "", "email": "", "phone": "", "password": "", "sscBatch": 1995, "rollNumber": "", "section": "", "profession": "", "company": "", "locationCity": "" },
  "rsvp": { "packageName": "", "extraAdults": 0, "extraChildren": 0, "tshirtSize": "", "mealPreference": "", "paymentMethod": "bKash|Nagad|Bank|Cash", "transactionId": "", "donationAmount": 0, "notes": "" }
}
```
**Joining needs a profile photo.** A signed-out join is sent as `multipart/form-data` with two fields: `payload` (the JSON above, stringified) and `photo` (JPEG, PNG or WebP, at most 5 MB, at least 600 x 600 px). Signed-in members send plain `application/json` and no photo. The server checks the real image format, applies the EXIF rotation, strips all metadata, and stores a print master (`original.jpg`, JPEG, long side up to 2400 px) and a 400 x 400 web avatar (`avatar.webp`) under `UPLOADS_DIR/avatars/<id>/` before the registration is saved (removed again if the registration fails). The profile gets `avatarUrl` and `avatarOriginalUrl`.

Success: `201 { registration: MemberRegistration, createdAccount: { email } | null }`. The registration starts `PENDING_PAYMENT` whenever a fee or donation is due; only a free event (verified members only) starts `CONFIRMED`.

Errors: `400 PHOTO_REQUIRED` ("Please add a profile photo."), `400 INVALID_PHOTO` ("Please upload a JPEG, PNG or WebP photo." / "The photo must be 5 MB or smaller." / "The photo must be at least 600 × 600 pixels."), `400 INVALID_ACCOUNT`, `UNKNOWN_PACKAGE`, `INVALID_GUESTS`, `INVALID_DONATION`, `PAYMENT_REQUIRED`, `MEMBERSHIP_MUST_BE_PAID`; `401 SIGN_IN_REQUIRED`; `403 VERIFIED_MEMBERS_ONLY`; `404 EVENT_NOT_FOUND`; `409 ALREADY_REGISTERED`, `DUPLICATE_TRANSACTION`, `REGISTRATION_CLOSED`.

Request-level errors, returned before any of the checks above:
- **Size limit:** the whole multipart body may be at most the 5 MB photo limit plus 64 KB for the other fields. A larger body is refused with `400 INVALID_PHOTO` ("The photo must be 5 MB or smaller."). This happens up front when `Content-Length` is too large, or as soon as a streamed body passes the cap, so an oversized upload is never read in full. A `photo` part over 5 MB inside a smaller body gets the same response.
- **`400 INVALID_REQUEST`** ("Invalid request."): the body is not valid JSON, the `payload` field is missing or is not a JSON object, or the multipart body cannot be parsed (including a multipart request with no body).

### `GET /api/media/avatars/[id]/avatar.webp`
Public. `id` is a 32-character lowercase hex id; anything else is `404`. `image/webp`, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`.

### `GET /api/media/avatars/[id]/original.jpg`
The print-quality master. Admin / super admin only (`403` otherwise), `Cache-Control: private, no-store`, served inline as `member-photo-<id>.jpg`. Any other file name is `404`.

### `GET /api/me/registrations`
Auth: signed in. `200 { registrations: MemberRegistration[] }` (each `CONFIRMED`/`CHECKED_IN` one carries its `ticket`); `401 { error: "Unauthorized" }`.

### `POST /api/events/verify-ticket`
Auth: `ADMIN`, `SUPER_ADMIN` or `MODERATOR` (gate staff). Body `{ "code": "SSGHS-TICKET:<token>" }` (the bare token is also accepted). Checks a ticket in exactly once.

- `200 { ok: true, attendee: { name, batch }, eventTitle, packageName, headCount }` - admitted.
- `409 { ok: false, reason: "INVALID" | "PENDING_PAYMENT" | "CANCELLED" | "ALREADY_CHECKED_IN", message }` - refused.
- `400 { error: "Scan a ticket first." }` (missing code); `403 { error: "Only gate staff can check tickets in." }`.

### `GET /api/admin/events`
Auth: `ADMIN` / `SUPER_ADMIN`. `200 { events: PublicEvent[] }` (includes `registrationEnabled`); `403`.

### `POST /api/admin/events`
Auth: admin. Body: the event fields (title, date, location, category, capacity, packages, fees, registration deadline, `registrationEnabled`, `isMembershipEvent`, `paymentInstructions`, and so on). `201 { event: PublicEvent }`. Errors: `400 INVALID_EVENT`, `FREE_MEMBERSHIP_EVENT`; `403`.

### `GET /api/admin/events/[id]`
Auth: admin. `200 { event: PublicEvent, registrations: AdminRegistration[], totals: { confirmedRevenue, pendingRevenue, confirmedDonations, headCount } }`; `404 EVENT_NOT_FOUND`; `403`.

### `PUT /api/admin/events/[id]`
Auth: admin. Body: event fields as for create. `200 { event: PublicEvent }`. Errors: `400 INVALID_EVENT`, `FREE_MEMBERSHIP_EVENT`; `404 EVENT_NOT_FOUND`; `403`.

### `DELETE /api/admin/events/[id]`
Auth: admin. `200 { success: true }`; `409 EVENT_HAS_REGISTRATIONS` (close registration instead); `404 EVENT_NOT_FOUND`; `403`.

### `PATCH /api/admin/events/[id]/registrations/[regId]`
Auth: admin. Body `{ "action": "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN" }`. `200 { registration: AdminRegistration }`.

- `APPROVE` (from `PENDING_PAYMENT`) records `confirmedBy`/`confirmedAt`; for the membership event it also verifies the member (user and profile `VERIFIED`, pending verification request `VERIFIED`) in the same transaction.
- `CANCEL` on a membership registration rejects a member who is still `PENDING`.
- Errors: `400 { error: "Unknown action." }` (also `INVALID_ACTION` from the service); `404 REGISTRATION_NOT_FOUND`; `409 INVALID_TRANSITION` (wrong current status, or another admin changed it first); `403`.

---

## 💰 5. Donation Initiatives

### `GET /api/donations/campaigns`
Fetches transparent fundraising campaigns.

---

## 🛡️ 6. Admin Endpoints

### `GET /api/admin/verifications?status=PENDING|VERIFIED|REJECTED|all`
Auth: `ADMIN` / `SUPER_ADMIN` (`403` otherwise). Default status `PENDING`; an unknown value is `400`. `200 { requests, total }`; each request carries its `user` (email, status, profile) and `awaitingPayment: boolean`, true when the member has a pending membership (Jubilee) registration payment. Database failure: `503`.

### `PATCH /api/admin/verifications`
Auth: admin. Body `{ requestId, status: "VERIFIED" | "REJECTED" }`. `200 { message, request }`. Errors: `400` invalid input; `404` request not found; `409` already decided, or the member is awaiting payment ("Confirm their Jubilee payment from the event's attendee list."); `503` database failure.
