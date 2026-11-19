# Reference-based agreement generation

## Student document approval and signing flow

1. The student signs in using their registered email address as the username and their password.
2. They complete their profile, create a study application and upload NIC, passport, CV and other requested documents.
3. Authorized staff scan/review the documents, verify identity details and approve the application. Existing agreement prerequisites, including the approved template and agreed payment schedule, still apply.
4. Agreement generation runs independently of approval-letter creation. A letter failure is reported without preventing an otherwise eligible agreement from being generated.
5. Successful agreement registration creates an `Agreement ready for signature` notification. Student notifications now include **Open agreement**, linking to `/student-portal/agreements`; sign-in and account permissions remain required.
6. The student reviews the PDF, draws or uploads their signature, explicitly confirms consent and submits. The existing signature function stores the student-signed PDF and advances it to management review.

Email links require deploying the updated `deliver-portal-emails` function, setting `PORTAL_ORIGIN` to the hosted HTTPS portal origin, configuring the approved email provider, applying the existing outbox setup and running the delivery worker. Without email delivery, the message remains available inside the portal. Deploy `generate-agreement` and `submit-agreement-signature` if their current versions are not already installed. Local checks do not establish that these functions or email delivery are working in production.

## What was extracted

The supplied signed PDF contains 15 physical pages: an eight-page service agreement with 15 main clauses and Schedule A, a consent letter, four pages of Ireland guidance, a student application form and a signing audit report.

The agreement covers interpretation, appointment, scope, payment, refunds, 365-day validity, obligations, liability, confidentiality, indemnification, third parties, amendment, termination, five-year records retention and original documents. These are terms in the supplied reference, not a statement that they have been legally validated.

The reference's fee example is USD 199 at registration and USD 199 upon visa approval. Its separate guidance also describes dependent and direct-offer charges. These figures are not automatically applied to new students. Save the actual agreed payment schedule and currency for each application. The current schedule UI requires dated installments; it does not automatically trigger charges upon visa approval.

## Implemented

- Admins can load the sanitized reference under **Agreement templates → Use reference agreement as a new draft**. This creates an editor draft; saving persists it through the existing template permissions.
- All 15 main clauses, Schedule A and the consent letter are retained as editable draft text. Payment clauses use the application's saved fees/services and management payment instructions. The signature section uses fresh pending-signature fields and blank witness fields.
- Student names, IDs, addresses, country, course, institution, intake, reference and agreement date are filled per application. Original personal data, signatures, witnesses, dates, bank account and audit events are not reused.
- A legal reviewer can inspect the complete template text before approving the exact version. Existing approval and activation rules remain in force.
- Authorized approval officers have **Generate agreements** in Staff Portal: select an application and approved template, generate a PDF and open existing PDFs.
- The server validates the selected template and existing approval/document/profile/payment requirements. Missing template fields return an actionable error rather than being left blank in the PDF.
- PDFs use measured text wrapping and page numbering. Signing continues through the existing student-first signature workflow and private storage.

The dated Ireland guidance and application form are not embedded in generated agreements. Signing audit records must be generated from the new agreement's actual signing events. Witness fields are blank; the portal does not currently implement witness authentication. Review that requirement when approving the template.

## Activate in the deployed system

1. Deploy the updated function and its shared module: `supabase functions deploy generate-agreement`.
2. Deploy the frontend changes. This change adds no database tables; the existing `student_workflow.sql` setup must already be applied, including `payment_instructions`.
3. As admin, complete management business details, payment currency/methods and **Bank details and payment instructions**.
4. Load the reference draft, review its clauses and save. As the assigned legal reviewer, inspect and approve it. This feature does not mark the supplied signed document as approval of a new template.
5. Complete the student's application, document/identity review and payment schedule. Select the approved application and template under **Generate agreements**.
6. Sign in as that student to verify private viewing, downloading and signing. Verify that another student cannot access the PDF.

## Validation and limits

Run `node --test tests/agreement-text.test.mjs`, `npm run lint` and `npm run build`.
The PDF renderer is exercised locally with fictional data and rendered pages are inspected. Live deployment, authentication, RLS and storage access require a configured Supabase project and authorized test accounts; local tests do not verify those settings.
