# Student portal verification

Local checks: `npm.cmd run lint`, `node --test tests/portal-data.test.mjs tests/agreement-text.test.mjs`, and `npm.cmd run build`.

The regression tests use a mocked database. They check isolated feature failures, account-scoped reads, role-specific loading, missing profiles and preserving phone numbers. They do not verify live Supabase permissions or payment providers.

## Missing payment table

Run this read-only query in the authorized Supabase project's SQL Editor:

```sql
select to_regclass('public.portal_payments');
```

If null, the payment migration is missing. Follow the migration order in [server setup](../supabase/functions/README.md). Apply only missing migrations; existing scripts are not all rerunnable. If the table exists, inspect API grants, RLS policies and schema-cache state. Refresh the portal after repairing the backend.

## Agreement not visible

Staff must generate and release the student's agreement after required profile, document, template and payment-schedule checks succeed. Signing in alone does not generate an agreement. Follow [agreement generation](agreement-generation.md). An error loading agreements must be resolved before treating the account as having no agreement.

## Live acceptance checks still required

Using authorized student and staff test accounts:

- Sign in, save a profile, refresh and confirm the complete phone number persists.
- Request a password reset and follow the email back to the configured portal origin.
- Upload a test document and confirm scanner processing and staff verification.
- Generate an agreement, review its PDF, submit a signature, obtain staff approval and download the completed PDF.
- Use the payment provider's test environment to confirm checkout, callback status and receipt download.
- Confirm a different student cannot read the first student's rows or private storage objects.

Keep service-role and provider secrets in server-side configuration. Live authentication, storage policies, scanner, signing and payment integrations were not validated by the local build.
