# Events & RSVP — Database Design

**Status:** Approved design, awaiting spec review · **Date:** 28 Sept 2026

## 1. Goal

Events and RSVPs currently live in hard-coded sample data and in each admin's own browser (`localStorage`). The RSVP form stores nothing and reports success anyway, and paid Golden Jubilee packages show "confirmed" with no payment.

After this change:

- Admins create and edit events once, in the database, and every visitor sees them.
- A visitor who is not yet a member registers for the portal **and** RSVPs to an event in **one form**, in one step.
- Paid RSVPs are recorded as **Pending payment** with the bKash/Nagad transaction ID the member enters; an admin checks it and confirms.
- Each confirmed registration gets its own **event ticket QR**, which gate staff scan to check the attendee in, once.
- Nothing claims "confirmed" unless it is.

**Success:** an admin creates an event; a new visitor finds it, fills the combined form and lands on their dashboard; the admin sees the RSVP with its transaction ID and confirms it; the member sees their ticket; the gate scan checks them in, and a second scan is refused. All of it survives a reload and a different browser.

## 2. Decisions

| Question | Decision |
| :--- | :--- |
| Paid registrations | **Manual transaction-ID check.** Member pays by bKash/Nagad/bank and enters the TrxID; RSVP is saved as Pending payment; an admin confirms. Online gateway checkout is out of scope. |
| Who can RSVP | Members of any status. A signed-out visitor fills a **combined form** that creates their account and the RSVP together. |
| Scope of the combined form | **Every event** uses the same RSVP form; free events skip the payment step. |
| What attendees show at the gate | A **separate event ticket** per confirmed registration, independent of membership verification. |
| Data model | Extend the existing `Event` and `EventRegistration` tables; rich content (packages, agenda, highlights) stored as JSON. |
| Existing event data | Starting from zero: the 5 sample events become seeded database rows; browser-stored admin events are discarded. |

**Future (not in this change):** member registration and event RSVP will be separated again once the portal has members beyond Jubilee attendees. To keep that cheap, the combined form calls the **same account-creation function** as `/api/auth/register`, and the RSVP step works the same whether the account was just created or already existed.

## 3. Data Model

### `Event` — new columns (all optional)

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `subtitle` | String? | Jubilee-style subtitle |
| `guestOfHonor` | String? | |
| `souvenirDetails` | Text? | |
| `registrationDeadline` | DateTime? | RSVPs close after this time |
| `isMegaEvent` | Boolean (default false) | Selects the Jubilee page layout |
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
- **Initial status:** `CONFIRMED` when the fee is 0, otherwise `PENDING_PAYMENT`.
- A price changed after registration does not change an existing registration's `totalFee`.

## 4. APIs

### Public
- `GET /api/events` — events from the database with live head count, places left and whether registration is open (flag, deadline, capacity, payment instructions present for paid events). The sample-data fallback is removed.
- `GET /api/events/[slug]` — one event by **slug**; unknown slug returns 404. Public URLs become `/events/<slug>`.

### Admin (ADMIN / SUPER_ADMIN)
- `POST /api/events`, `PUT /api/events/[id]`, `DELETE /api/events/[id]` — full create/edit including packages, agenda and fees, validated on the server. Deleting an event that has registrations is refused (409); admins close registration instead.
- `GET /api/admin/events/[id]/registrations` — attendees with payment status, membership status, totals (confirmed revenue, pending revenue, head count).
- `PATCH /api/admin/events/[id]/registrations/[regId]` — set `CONFIRMED`, `CANCELLED` or `CHECKED_IN`, recording who and when.

### RSVP
- `POST /api/events/[slug]/rsvp` — one endpoint for both cases.
  - **Signed-in member:** RSVP fields only.
  - **Signed-out visitor:** RSVP fields plus account fields (name, email, phone, password, SSC batch, roll, section). The account is created through the shared registration function; account and registration are written in **one database transaction**, so a failure leaves neither.
  - Validation: registration open, before deadline, capacity available (checked inside the same transaction), no existing registration for the member, package exists, transaction ID and payment method required for paid events, transaction ID not already used, fee computed on the server.
  - Existing email for a signed-out visitor: **409 "You already have an account — sign in to RSVP"**; an RSVP is never attached to an existing account without its password.
  - Response: the registration and its status. The page signs a newly created member in with the password they just chose.
- `GET /api/events/[slug]/rsvp` — the signed-in member's own registration for the event, including the **ticket** (token + QR) once `CONFIRMED` or `CHECKED_IN`.

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
- `/events` — database events, with "X of Y places left" and "Registration closed" states.
- `/events/[slug]` — keeps today's two layouts: Jubilee layout (countdown, packages, agenda, souvenir) when `isMegaEvent`, standard layout otherwise. Unknown slug → 404 page.
- Home page and dashboard "upcoming event" cards read the next real event.

### RSVP form (rewired `components/events/RSVPModal.tsx`)
- **Signed out:** step 1 "Your details" (name, email, phone, password, SSC batch, roll, section); step 2 "Registration" (package, extra adults, children, T-shirt, meal, payment method, transaction ID, with the event's payment instructions shown beside it).
- **Signed in:** step 2 only, name pre-filled.
- A live total using the same fee rules as the server.
- After submit: "Registered — Pending payment confirmation" (or "Registered" for free events); a new member is signed in automatically.
- If the member is already registered, the event page shows their status and, once confirmed, their ticket QR.

### Member dashboard
- New "My Events" card: the member's registrations, status, and "Show ticket" once confirmed.

### Admin
- `/admin/events` — list/create/edit/delete via the API, including a package editor (name, price, includes), agenda editor, fees, deadline, capacity and payment instructions.
- `/admin/events/[id]` — attendee list from the API: name, batch, package, head count, fee, payment method, transaction ID, payment status, membership status; actions Confirm payment, Cancel, Check in; confirmed/pending revenue and head count.
- Gate scanner (`/admin/gate-verify`) — accepts alumni cards and event tickets; for a ticket shows attendee, package and head count and checks them in.

### Removed
- `lib/events-service.ts` (browser-storage events and attendees), the `/events/[id]/ticket` page and its API route, and the RSVP modal's fake success timer.

## 6. Edge Cases

- Paid event without `paymentInstructions` → RSVP closed with "Payment details coming soon".
- Duplicate transaction ID → rejected (unique constraint), with a clear message.
- Two people taking the last places at once → capacity is checked inside the insert transaction.
- Cancelled registration frees its places; its ticket is refused at the gate.
- Database unavailable → a clear error everywhere; never a fake "registered".
- Old sample-era links (`/events/evt-…`) → 404.

## 7. Migration

1. `npm run db:push` — adds the new columns and enum; nothing is dropped.
2. `npm run db:seed` — adds the 5 events (the Golden Jubilee with its real packages, fees, agenda and payment instructions to be filled in by an admin). Idempotent by slug; re-running neither duplicates nor overwrites admin edits.

Applies to local and remote databases. Back up the remote database before `db:push`.

## 8. Testing

Against a throwaway local MariaDB (Docker), as in earlier rounds.

- **API:** visitor RSVP creates account + registration together and signs in; member RSVP; duplicate RSVP; full event; past deadline; paid event missing transaction ID; duplicate transaction ID; tampered fee (server price wins); existing email (409); paid event without payment instructions.
- **Admin:** create an event with packages and agenda; confirm, cancel and check in attendees; delete refused when registrations exist.
- **Gate:** confirmed ticket checks in; second scan "already checked in"; pending and cancelled tickets refused; forged ticket refused; an alumni card is not accepted as a ticket.
- **Browser:** full Jubilee journey (visitor → combined form → dashboard → admin confirms → ticket shown → gate scan), plus phone width.

## 9. Out of Scope

- Online payment gateway checkout for events.
- Separating member registration from event RSVP (planned later; see §2).
- Email/SMS confirmations.
- Refund handling beyond marking a registration cancelled.
