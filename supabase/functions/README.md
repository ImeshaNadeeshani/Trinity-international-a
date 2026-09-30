# Portal server functions

Apply `../student_portal.sql` and then `../workflow_extensions.sql` in the Supabase SQL editor. Deploy these functions with the Supabase CLI after setting the environment secrets below. The browser never receives service-role, scanner, signing or email credentials.

## First administrator

Create and confirm the first Trinity staff account through the student portal. In Supabase SQL Editor, replace the email below with that confirmed management account and run this once to bootstrap the first administrator. Afterward, assign roles through the administrator dashboard.

```sql
update public.portal_profiles
set role = 'admin'
where id = (select id from auth.users where email = 'CONFIRMED-MANAGEMENT-EMAIL')
  and role = 'student';
```

## Functions

- `scan-student-document` submits a private upload to the configured scanner. Documents remain unavailable to Trinity reviewers until the scanner returns `clean`.
- `generate-approval-letter` creates an internal approval PDF with Trinity's logo after an authorized board officer approves the application. It refuses to create an official letter while the registered business or officer details remain pending.
- `generate-agreement` creates a server-side PDF only from an active legally approved template, verified documents, a completed student profile, confirmed business details and an administrator-entered payment schedule.
- `start-agreement-signing` requires a signed-in authorized signatory or the relevant student and a separate explicit confirmation. It remains disabled until an approved signing provider is selected and configured.
- `complete-agreement-signing` accepts provider callbacks only with a valid HMAC signature. The provider gateway must authenticate the signer, return the signed PDF, and call the callback with the request ID and envelope ID created by the start function.
- `notify-student` records a portal notification and optionally sends transactional email.

## Server environment

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Add these secrets when their providers are selected:

- `PORTAL_ORIGIN`: exact hosted portal origin for browser function calls.
- `MALWARE_SCAN_GATEWAY_URL`, `MALWARE_SCAN_GATEWAY_API_KEY`: HTTPS internal scanner adapter. `POST /scan` receives `{ document_id, file_name, mime_type, sha256, base64 }` and must return `{ scan_status: "clean" | "infected" }`. Do not upload student documents to an unapproved scanning service.
- `SIGNATURE_GATEWAY_URL`, `SIGNATURE_GATEWAY_API_KEY`, `SIGNATURE_WEBHOOK_SECRET`: HTTPS signing adapter. `POST /envelopes` receives the agreement PDF, digest, signer and internal request ID; it returns `{ envelope_id, signing_url }`, with `signing_url` on the same HTTPS origin. On signature, POST the original JSON payload `{ request_id, envelope_id, event: "signed", signed_pdf_base64 }` to `complete-agreement-signing` with `x-signature` set to the lowercase hex HMAC-SHA256 of the exact request body. The adapter must verify signer identity and preserve provider signing evidence in the returned PDF.
- `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `PORTAL_FROM_EMAIL`: transactional email. Email remains portal-only until provider credentials and sender-domain verification are configured.

Set the provider names in the administrator settings only after management has selected them. Provider secrets belong in Supabase Edge Function secrets, not in `.env.local` or the settings table.

## Deploy

```sh
supabase functions deploy scan-student-document
supabase functions deploy generate-approval-letter
supabase functions deploy generate-agreement
supabase functions deploy start-agreement-signing
supabase functions deploy complete-agreement-signing
supabase functions deploy notify-student
```

The default agreement template is inserted as `draft`. A user assigned the `legal_reviewer` role must approve the exact template version before it can be activated. Refund settings also require a separate administrator management approval and legal reviewer approval. No unapproved refund rules are enforced.
