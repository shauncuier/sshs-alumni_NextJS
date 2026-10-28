# Personal data: what is kept and for how long

What the platform stores about people, why, and when it is removed. Files live under `UPLOADS_DIR` and are served only through checked API routes; the rest is in the database.

| Data | Who can see it | Kept for |
| --- | --- | --- |
| Account: email, password hash, role, status | The member; admins | While the account exists |
| Profile: name, batch, profession, city, bio, links | Verified members and the public directory. Phone and email only if the member makes them public | While the account exists; the member can edit it |
| Profile photo (web size and print master) | Public on the profile; master for admins (cards, magazine) | While the account exists. **Rejected applicants: deleted 30 days after the rejection** |
| Proof of study (certificate, marksheet, school ID) | Admins only | **Kept on record** after the membership is decided, approved or rejected (decided 2026-10-29). Requests decided before that date had their file deleted at the decision |
| Payment screenshot sent when joining | Admins only | While the membership is valid. **Rejected applicants: deleted 30 days after the rejection**; the transaction ID and amount stay (needed for refunds and accounts) |
| Event registrations, tickets, check-ins | The member; admins and gate staff | Kept as the event's record |
| Donations: name, contact, amount, transaction ID | Admins; the donor's name publicly unless anonymous | Kept (financial records) |
| Messages | The two members | While both accounts exist |
| Feed posts, comments, likes | Members | Until the author or a moderator deletes them |
| Contact-form messages | Admins (activity log, committee inbox) | Activity-log retention |
| Activity log: who did what, IP address, browser | Admins and super admin | `LOG_RETENTION_DAYS` (default 365), then deleted at server start |
| Phone and email verification codes | Nobody (sealed, hashed) | Minutes; never stored in plain text |

## Automatic clean-up

- **Rejected applicants** (`lib/privacy-cleanup.ts`): photos and payment screenshots of members still rejected `PRIVACY_REJECTED_DAYS` (default 30) after the decision are deleted; their proof of study is kept. The server runs it a minute after start and then daily; `npm run privacy:cleanup` runs it now. Each run that deletes something is written to the activity log (`privacy.rejected_files_purged`, counts only).
- **Activity log**: entries older than `LOG_RETENTION_DAYS` are deleted at every server start.
- **Proofs**: never deleted automatically. Only deleting the whole account (`/admin/users`) removes a member's proof files.

## Requests from members

A member who asks for their data to be removed: an admin disables the account in `/admin/users`, and the technical team deletes the profile photo folder and the account (the database removes the profile, messages, notifications and verification requests with it). Donations and registrations stay as financial and event records with the name kept.
