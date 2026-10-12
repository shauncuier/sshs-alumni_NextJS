# Manual QA by role (roadmap step 26)

Two parts. **Part 1** is automatic; **part 2** is done by hand, once per role, before launch and after any big change. Mark each line ✅ or write what went wrong (page, phone/browser, what you expected, what happened).

## Part 1 — who can open what (automatic)

With `npm run dev` running:

```bash
npm run qa:roles
```

It creates one throwaway account per role (deleted at the end), signs in over HTTP and checks 42 pages and 6 APIs for: visitor, alumni, moderator, admin, super admin, plus that a **pending** member cannot sign in. Last run 2026-10-12: all passed.

## Part 2 — doing things (by hand)

### Visitor (signed out)

- [ ] Home, events, news, gallery, stories, achievements, batches, alumni directory, careers, mentorship, about, contact load and look right on a phone.
- [ ] Directory shows no phone or email unless the member made them public.
- [ ] Contact form sends; the message reaches `sabujshikshayatanalumni@gmail.com` (and is in Admin → Logs).
- [ ] Donate page shows the open campaigns and the real payment details; a donation with a transaction ID is accepted ("waiting for the committee").
- [ ] "Post a job" and "Become a mentor" ask to sign in first.
- [ ] Join the association (see `PHONE_TEST_CHECKLIST.md`): ends with "waiting for approval"; signing in is refused until approved.

### Alumni (verified member)

- [ ] Sign in, sign out, sign in again; wrong password is refused.
- [ ] Profile: edit details, change photo, change password (then sign in with the new one).
- [ ] Digital card shows the right name, batch and photo; the QR opens the verify page.
- [ ] Feed: post, like, comment, delete own comment and post; cannot delete someone else's.
- [ ] Network: search by name and batch; send a message; the other member sees it and gets a notification.
- [ ] Events: register for a free event, see the ticket QR; for a paid event, the registration waits for payment confirmation.
- [ ] Careers: post a job (waits for approval); apply to an approved job.
- [ ] Mentorship: apply as mentor; request a mentor; the mentor accepts with meeting details.
- [ ] Cannot open `/admin` or `/gate` (shows the "no access" page).

### Moderator

- [ ] Admin panel shows only News, Gallery, Stories, Jobs, Mentors (and the gate).
- [ ] Publish a news article with an image; it appears on `/news`; edit and unpublish it.
- [ ] Create a gallery album with photos; publish; it appears on `/gallery`.
- [ ] Add a story and an achievement; publish.
- [ ] Approve and reject a job post and a mentor application (with a reason).
- [ ] Delete an inappropriate feed post.
- [ ] Gate: pick the event, scan a ticket with the phone camera (https address) — LET IN, then "Already checked in"; a ticket for another event is refused.
- [ ] Cannot open Users, Donations, SMS, Logs, Verifications.

### Admin

- [ ] Verifications: approve one join and reject one (on a phone); the approved member can sign in; the rejected one cannot.
- [ ] Events: create an event with packages and dates; guest types (e.g. spouse ৳700 up to 1, child ৳500); payment methods come from Admin → Payment settings; edit; the membership flag cannot move while joins are waiting.
- [ ] Event attendees: confirm a payment, check someone in, undo, cancel.
- [ ] Donations: set payment details; create, edit, close and reopen a campaign; verify and reject a donation (the donor gets the receipt email once the email domain works).
- [ ] Batches: set a representative and reunion date; they show on the batch page.
- [ ] Bulk SMS: send one message to a test group of committee phones; it appears in the history with the right count.
- [ ] Volunteers: approve and decline an application.
- [ ] Users: add a moderator, change a role, reset a password, disable and enable an account (the user is signed out each time).
- [ ] Logs: each action above appears with who, what and when; search and filters work.

### Super admin

- [ ] Signs in with the address and password from the server's environment.
- [ ] Everything an admin can do.
- [ ] The super admin account cannot be changed or disabled from Users.
- [ ] Changing `SUPER_ADMIN_PASSWORD` on the server and restarting signs the super admin out; the new password works.

Issues found here become their own roadmap steps.
