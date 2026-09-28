# Events & RSVP — Database Design

**Status:** Design, awaiting spec review · **Date:** 28 Sept 2026

## 1. Goal

Events and RSVPs currently live in hard-coded sample data and in each admin's own browser (`localStorage`). The RSVP form stores nothing and reports success anyway, and paid Golden Jubilee packages show "confirmed" with no payment. Membership registration is free and separate.

After this change:

- Admins create and edit events once, in the database, and every visitor sees them.
- **Joining the association is the paid Golden Jubilee registration.** A new member fills **one form** that creates their account and their Jubilee registration together. There is no free sign-up.
- The new member pays by bKash/Nagad/bank and enters the transaction ID. The registration and the membership stay **pending** until an admin checks the payment and the school details and **approves both in one step**.
- Each confirmed registration gets its own **event ticket QR**, which gate staff scan to check the attendee in, once.
- Other events (free or paid) are for **existing verified members** who are signed in.
- Nothing claims "confirmed" or "verified" unless it is.

**Success:** a visitor opens the Jubilee (or `/register`), fills the combined form, pays and enters the TrxID, and lands on their dashboard as "Pending — payment and membership under review". An admin sees the TrxID next to their school details and approves; the member becomes verified, their registration confirmed, and their ticket and alumni card appear. The gate scan checks them in and a second scan is refused. A signed-out visitor cannot create an account through a free event. All of it survives a reload and a different browser.

## 2. Decisions

| Question | Decision |
| :--- | :--- |
| How people join | **Only through the paid membership event** (the Golden Jubilee). The combined form creates the account and the paid registration together. `/register` shows the same combined form. No free sign-up. |
| Paid registrations | **Manual transaction-ID check.** Member pays by bKash/Nagad/bank and enters the TrxID; the registration is saved as Pending payment. Online gateway checkout is out of scope. |
| Approving a new member | **One admin action** on the membership event's attendee list: Approve confirms the payment **and** verifies the membership; Reject cancels the registration **and** rejects the membership. |
| Other events | Signed-in **verified members only**, through the same RSVP form without the account step. Free events need no payment; paid ones use the same TrxID check. |
| What attendees show at the gate | A **separate event ticket** per confirmed registration. |
| Data model | Extend the existing `Event` and `EventRegistration` tables; rich content (packages, agenda, highlights) stored as JSON. |
| Existing event data | Starting from zero: the 5 sample events become seeded database rows; browser-stored admin events are discarded. |

**Future (not in this change):** membership registration and event RSVP will be separated again later. To keep that cheap, the combined form calls the **same account-creation function** that `/api/auth/register` uses today, and the RSVP step works the same whether the account was just created or already existed.

## 3. Data Model

### `Event` — new columns (all optional)

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `subtitle` | String? | Jubilee-style subtitle |
| `guestOfHonor` | String? | |
| `souvenirDetails` | Text? | |
| `registrationDeadline` | DateTime? | RSVPs close after this time |
| `isMegaEvent` | Boolean (default false) | Selects the Jubilee page layout |
| `isMembershipEvent` | Boolean (default false) | Registering for this event is how new members join. At most one event has it; setting it on one event clears it on the others. |
| `agenda` | Json (default `[]`) | `[{ day?: number, time: string, activity: string }]` |
| `highlights` | Json (default `[]`) | `string[]` |
| `packages` | Json (default `[]`) | `[{ name, price: number (BDT), description, includes: string[], isPopular?: boolean }]` |
| `extraAdultFee` | Float (default 0) | Per extra adult (Jubilee: 500) |
| `childFee` | Float (default 0) | Per child under 12 (Jubilee: 300) |
| `paymentInstructions` | Text? | Where and how to pay, e.g. "Send to bKash 01XXXXXXXXX (Merchant), then enter your TrxID" |

Existing `registrationFee` remains the price for events **without** packages. `attendeesCount` is no longer typed in by hand: API responses compute the live head count from registrations (see below), and the column is left unused.

### `EventRegistration` — new columns

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `packageName` | String? | Chosen package (null for events without packages) |
| `extraAdults` | Int (default 0) | |
| `children` | Int (default 0) | Children under 12 |
| `tshirtSize` | String? | |
| `totalFee` | Float (default 0) | **Computed on the server** at registration time; never taken from the form |
| `paymentMethod` | String? | `bKash`, `Nagad`, `Bank`, `Cash`; null for free events |
| `transactionId` | String? **@unique** | One payment cannot be claimed by two registrations |
| `status` | enum `RegistrationStatus` | `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `CANCELLED` |
| `confirmedBy` | String? | Admin email |
| `confirmedAt` | DateTime? | |
| `checkedInAt` | DateTime? | |
| `updatedAt` | DateTime @updatedAt | |

Existing `guestCount`, `mealPreference` and `notes` stay. Constraint: **`@@unique([eventId, userId])`**, one registration per member per event.

### Rules

- **Head count** of a registration = `1 + extraAdults + children`.
- **Capacity:** the sum of head counts for `PENDING_PAYMENT`, `CONFIRMED` and `CHECKED_IN` registrations may not exceed `maxAttendees`.
- **Live attendee count** shown on pages = head count of `CONFIRMED` + `CHECKED_IN` registrations.
- **Fee:** `packagePrice (or registrationFee) + extraAdults × extraAdultFee + children × childFee`.
- **Membership event must be paid:** it must have at least one package with a price above 0 (or a `registrationFee` above 0). The admin form refuses to mark a free event as the membership event.
- **Initial status:** `PENDING_PAYMENT` for any fee above 0. Only a free event, which only verified members can register for, starts as `CONFIRMED`.
- **Approving a membership registration** (one transaction): registration → `CONFIRMED`; user → `VERIFIED`; profile `verificationStatus` → `VERIFIED`; the member's pending `VerificationRequest` → `VERIFIED` with `reviewedBy`.
- **Rejecting a membership registration** (one transaction): registration → `CANCELLED`; user, profile and request → `REJECTED`.
- A price changed after registration does not change an existing registration's `totalFee`.

## 4. APIs

### Public
- `GET /api/events` — events from the database with live head count, places left and whether registration is open (flag, deadline, capacity, payment instructions present for paid events). The sample-data fallback is removed.
- `GET /api/events/[slug]` — one event by **slug**; unknown slug returns 404. Public URLs become `/events/<slug>`.
- `GET /api/events/membership` — the current membership event, used by `/register`; 404 when none is open.

### Admin (ADMIN / SUPER_ADMIN)
- `POST /api/events`, `PUT /api/events/[id]`, `DELETE /api/events/[id]` — full create/edit including packages, agenda, fees and the membership flag, validated on the server. Deleting an event that has registrations is refused (409); admins close registration instead.
- `GET /api/admin/events/[id]/registrations` — attendees with payment status, membership status and, for the membership event, school details (batch, roll, section); totals (confirmed revenue, pending revenue, head count).
- `PATCH /api/admin/events/[id]/registrations/[regId]` — `CONFIRMED` (Approve), `CANCELLED` (Reject/Cancel) or `CHECKED_IN`, recording who and when. On the membership event, Approve and Reject also verify or reject the membership (§3 Rules).
- Existing `PATCH /api/admin/verifications` — refuses (409) to verify a member whose membership registration is still `PENDING_PAYMENT`: "Confirm their Jubilee payment from the attendee list", so no one is verified without paying.

### RSVP
- `POST /api/events/[slug]/rsvp` — one endpoint.
  - **Membership event, signed-out visitor:** RSVP fields plus account fields (name, email, phone, password, SSC batch, roll, section). The account, its pending verification request and the registration are written in **one database transaction** through the shared account-creation function, so a failure leaves none of them.
  - **Membership event, signed-in member:** RSVP fields only (e.g. a member who registered before this change).
  - **Any other event:** signed-in **verified** members only; otherwise 401 (signed out) or 403 ("verified members only").
  - Validation: registration open, before deadline, capacity available (checked inside the same transaction), no existing registration for the member, package exists, transaction ID and payment method required when the fee is above 0, transaction ID not already used, fee computed on the server.
  - Existing email for a signed-out visitor: **409 "You already have an account — sign in to register"**; a registration is never attached to an existing account without its password.
  - Response: the registration and its status. The page signs a newly created member in with the password they just chose.
- `GET /api/events/[slug]/rsvp` — the signed-in member's own registration for the event, including the **ticket** (token + QR) once `CONFIRMED` or `CHECKED_IN`.
- `POST /api/auth/register` — closed while membership and the Jubilee are merged: returns 410 "Join through the Golden Jubilee registration" so no free account can be created by calling it directly. The account-creation logic moves to a shared function used by the RSVP endpoint.

### Tickets and gate
- Ticket token: the registration id encrypted with the same AES-256-GCM scheme as alumni cards (`lib/id-card.ts`), with a distinct token type so a card cannot be used as a ticket or vice versa.
- `POST /api/events/verify-ticket` — ADMIN, SUPER_ADMIN or MODERATOR only. Decrypts the ticket and:
  - `CONFIRMED` → marks `CHECKED_IN`, returns attendee, event, package and head count;
  - `CHECKED_IN` → refused, "Already checked in at 10:42";
  - `PENDING_PAYMENT` → refused, "Payment not confirmed";
  - `CANCELLED` → refused, "Registration cancelled";
  - forged, altered or unknown → refused.
- Removed: `POST /api/events/[id]/ticket`, which issued tickets without payment.

## 5. Pages & Forms

### Public
- `/events` — database events, with "X of Y places left" and "Registration closed" states. Non-membership events show "Verified members only" to signed-out visitors, with a link to join through the Jubilee.
- `/events/[slug]` — keeps today's two layouts: Jubilee layout (countdown, packages, agenda, souvenir) when `isMegaEvent`, standard layout otherwise. Unknown slug → 404 page.
- `/register` — shows the membership event's combined form ("Join the association — Golden Jubilee registration"). If no membership event is open: "Membership registration opens soon".
- `/login` — its "Apply for membership" link goes to `/register`.
- Home page and dashboard "upcoming event" cards read the next real event.

### Registration / RSVP form (rewired `components/events/RSVPModal.tsx`, also used by `/register`)
- **Membership event, signed out:** step 1 "Your details" (name, email, phone, password, SSC batch, roll, section); step 2 "Registration & payment" (package, extra adults, children, T-shirt, meal, payment method, transaction ID, with the event's payment instructions beside it).
- **Signed in:** step 2 only, name pre-filled.
- A live total using the same fee rules as the server.
- After submit: "Registered — payment and membership under review" (or "Registered" for free events); a new member is signed in automatically.
- If the member is already registered, the event page shows their status and, once confirmed, their ticket QR.

### Member dashboard, profile and card
- New "My Events" card: the member's registrations, status, and "Show ticket" once confirmed.
- A new member awaiting approval sees "Pending — payment and membership under review" (dashboard and profile already show the real membership status); the alumni card page keeps showing "not accepted at the gate until verified".

### Admin
- `/admin/events` — list/create/edit/delete via the API, including a package editor (name, price, includes), agenda editor, fees, deadline, capacity, payment instructions and the "membership event" switch.
- `/admin/events/[id]` — attendee list from the API: name, batch, roll, section, package, head count, fee, payment method, transaction ID, payment status, membership status; actions **Approve** (payment + membership on the membership event), **Reject/Cancel**, **Check in**; confirmed/pending revenue and head count.
- `/admin/alumni` and the dashboard verification queue — members with a pending membership payment show "Awaiting payment confirmation" with a link to the attendee list, instead of an Approve button.
- Gate scanner (`/admin/gate-verify`) — accepts alumni cards and event tickets; for a ticket shows attendee, package and head count and checks them in.

### Removed
- `lib/events-service.ts` (browser-storage events and attendees), the `/events/[id]/ticket` page and its API route, the RSVP modal's fake success timer, and the free registration form on `/register`.

## 6. Edge Cases

- Paid event without `paymentInstructions` → registration closed with "Payment details coming soon". For the membership event this also closes joining.
- Duplicate transaction ID → rejected (unique constraint), with a clear message.
- Two people taking the last places at once → capacity is checked inside the insert transaction.
- Cancelled or rejected registration frees its places; its ticket is refused at the gate.
- Members who joined before this change (already verified, no membership registration) stay verified and can register for the Jubilee while signed in.
- Database unavailable → a clear error everywhere; never a fake "registered".
- Old sample-era links (`/events/evt-…`) → 404.

## 7. Migration

1. `npm run db:push` — adds the new columns and enum; nothing is dropped.
2. `npm run db:seed` — adds the 5 events, with the Golden Jubilee as the **membership event** and its real packages, fees and agenda. Its payment instructions are left empty for an admin to fill in (joining stays closed until then). Idempotent by slug; re-running neither duplicates nor overwrites admin edits.

Applies to local and remote databases. Back up the remote database before `db:push`.

## 8. Testing

Against a throwaway local MariaDB (Docker), as in earlier rounds.

- **Joining:** visitor fills the combined form → account (PENDING), verification request and registration (PENDING_PAYMENT) created together and signed in; `/register` shows the same form; `POST /api/auth/register` returns 410; existing email → 409; missing or duplicate transaction ID refused; tampered fee (server price wins); joining closed when payment instructions are empty.
- **Approval:** Approve → registration CONFIRMED, user/profile/request VERIFIED, ticket and card become valid; Reject → registration CANCELLED, membership REJECTED; the verification queue refuses to verify a member with an unconfirmed membership payment.
- **Other events:** signed-out → 401, pending member → 403, verified member → registered (free: CONFIRMED; paid: PENDING_PAYMENT); duplicate RSVP; full event; past deadline.
- **Admin:** create an event with packages and agenda; only one membership event; a free event cannot be the membership event; delete refused when registrations exist.
- **Gate:** confirmed ticket checks in; second scan "already checked in"; pending and cancelled tickets refused; forged ticket refused; an alumni card is not accepted as a ticket.
- **Browser:** full journey (visitor → combined form → pending dashboard → admin approves → ticket and card valid → gate scan), plus phone width.

## 9. Out of Scope

- Online payment gateway checkout for events.
- Separating membership registration from the Jubilee (planned later; see §2).
- Email/SMS confirmations.
- Refund handling beyond marking a registration cancelled.
